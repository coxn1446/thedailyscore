import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import { CloseMark } from '../Brand/Marks';
import GameLogo from '../Brand/GameLogo';
import instagramLogo from '../../assets/instagram.png';
import { guestRecap } from '../../helpers/guestCache';
import { fetchRecap } from '../../helpers/scoreHelpers';
import { selectIsAuthenticated } from '../../store/auth.reducer';
import { drawStory, shareStory, storySpec, STORY_STYLES } from '../../helpers/storyCard';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This week' },
];

const STYLE_CLASS = {
  paper: 'border story-paper',
  ink: 'border story-ink',
  carmine: 'border story-carmine',
};

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const StoryShare = ({ onClose }) => {
  const signedIn = useSelector(selectIsAuthenticated);
  const [period, setPeriod] = useState('today');
  const [style, setStyle] = useState('paper');
  const [recap, setRecap] = useState(null);
  const [pending, setPending] = useState(false);
  const spec = storySpec(recap, style);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!signedIn) {
      setRecap(guestRecap(period));
      return undefined;
    }
    let cancelled = false;
    fetchRecap(period)
      .then((data) => {
        if (!cancelled) setRecap(data);
      })
      .catch(() => {
        if (!cancelled) setRecap({ period, games: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [period, signedIn]);

  const share = async () => {
    if (pending) return;
    setPending(true);
    try {
      const canvas = document.createElement('canvas');
      await drawStory(canvas, spec);
      const result = await shareStory(canvas);
      if (result === 'failed') toast.error('Could not share');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast.error(err.message || 'Could not share');
    } finally {
      setPending(false);
    }
  };

  const dialog = (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-inset px-margin py-space-lg" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Share to Instagram"
        className="w-full max-w-md border border-primary bg-background p-space-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-space-md">
          <h2 className="font-masthead text-headline-md text-primary">Share to Instagram</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-primary">
            <CloseMark />
          </button>
        </div>
        <nav aria-label="Score template" className="mt-space-lg flex gap-space-lg">
          {PERIODS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={period === item.id}
              onClick={() => setPeriod(item.id)}
              className={tabClass(period === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <nav aria-label="Story style" className="mt-space-md flex gap-space-lg">
          {Object.entries(STORY_STYLES).map(([id, item]) => (
            <button
              key={id}
              type="button"
              aria-pressed={style === id}
              onClick={() => setStyle(id)}
              className={tabClass(style === id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div data-testid="story-card" data-story={style} className={`mt-space-md p-space-lg ${STYLE_CLASS[style]}`}>
          <p className="story-kicker font-sans text-kicker uppercase tracking-kicker">{spec.kicker}</p>
          <h3 className="mt-space-sm font-masthead text-headline-md">{spec.title}</h3>
          {spec.edition ? <p className="mt-space-xs font-mono text-caption">{spec.edition}</p> : null}
          {spec.lines.length ? (
            <>
              {spec.rankHeader ? (
                <p className="story-kicker mt-space-md text-right font-sans text-kicker tracking-kicker">{spec.rankHeader}</p>
              ) : null}
              <ul className={`${spec.rankHeader ? '' : 'mt-space-md '}space-y-space-sm`}>
                {spec.lines.map((line) => (
                  <li key={line.slug} className="flex items-center gap-space-sm">
                    <GameLogo slug={line.slug} />
                    <span className="min-w-0 flex-1 font-sans text-body-md">{line.name}</span>
                    <span className="font-mono text-body-md">{line.line}</span>
                    {line.rank != null ? <span className="font-mono text-body-md">{line.rank}</span> : null}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <h3 className="mt-space-md font-masthead text-headline-md">Nothing filed.</h3>
          )}
          <p className="mt-space-lg font-sans text-body-md">{spec.footer}</p>
        </div>
        <button type="button" disabled={pending} onClick={share} className={`${inkButtonClass} mt-space-md`}>
          <img src={instagramLogo} alt="" className="mr-space-sm h-4 w-4 object-contain" />
          Share to Instagram
        </button>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default StoryShare;
