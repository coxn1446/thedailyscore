import React, { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import { CopyMark } from '../Brand/Marks';
import PublishForm from './PublishForm';
import StoryShare from '../Share/StoryShare';
import instagramLogo from '../../assets/instagram.png';
import GameLogo from '../Brand/GameLogo';
import GameMenu from './GameMenu';
import { fileGuestScore, guestTodayPayload } from '../../helpers/guestCache';
import { clientTimezone } from '../../helpers/identity';
import { SCORE_POSTED, fetchTodayScores, formatResult, formatTodayCopy, postScore, previewScore } from '../../helpers/scoreHelpers';
import { selectIsAuthenticated } from '../../store/auth.reducer';
import { reportBug } from '../../helpers/bugHelpers';
import { copyText } from '../../utils/copyText';

const PASTE_KEY = 'ds:pending-paste';

const iosApp = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

const linkClass =
  'font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';

const savedPaste = () => {
  try {
    return sessionStorage.getItem(PASTE_KEY) || '';
  } catch {
    return '';
  }
};

const ResultBlock = ({ result }) => (
  <div>
    <p className="flex items-center gap-space-sm font-sans text-kicker uppercase tracking-kicker text-secondary">
      <GameLogo slug={result.game?.slug} />
      {result.game.name}
    </p>
    <p className="mt-space-xs font-mono text-caption text-muted">#{result.puzzle_number}</p>
    <p className="mt-space-sm font-mono text-headline-md text-primary">{formatResult(result)}</p>
    {result.snippet ? (
      <pre className="mt-space-md overflow-x-auto whitespace-pre-wrap border border-border bg-inset p-space-sm font-mono text-caption text-primary">
        {result.snippet}
      </pre>
    ) : null}
  </div>
);

const PasteError = ({ message, signedIn, onReport }) => {
  if (!message) return null;
  if (message === 'Unrecognized result') {
    return (
      <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
        Game not recognized.{' '}
        <Link to={signedIn ? '/request-game' : '/login?next=/request-game'} className={linkClass}>
          Submit a request for a new game?
        </Link>
        {' '}
        {signedIn ? (
          <button type="button" onClick={onReport} className={linkClass}>
            Report a bug
          </button>
        ) : (
          <Link to="/login?next=/" className={linkClass}>
            Report a bug
          </Link>
        )}
      </p>
    );
  }
  return (
    <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
      {message}
    </p>
  );
};

const PasteDesk = ({ onPosted, games = [], onOpenGame }) => {
  const signedIn = useSelector(selectIsAuthenticated);
  const [phase, setPhase] = useState('empty');
  const [paste, setPaste] = useState(savedPaste);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const actionRef = useRef(() => {});
  const todayCopyRef = useRef(undefined);

  const rememberToday = (data) => {
    todayCopyRef.current = data?.scores?.length ? formatTodayCopy(data) : null;
  };

  const loadTodayCopy = () => {
    if (!signedIn) {
      rememberToday(guestTodayPayload());
      return Promise.resolve(todayCopyRef.current);
    }
    return fetchTodayScores().then((data) => {
      rememberToday(data);
      return todayCopyRef.current;
    });
  };

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const data = await previewScore(paste, clientTimezone());
      setPreview(data);
      setPhase('preview');
    } catch (err) {
      setPreview(null);
      setPhase('empty');
      setError(err.message || 'Unrecognized result');
    } finally {
      setPending(false);
    }
  };

  const confirm = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const saved = signedIn ? await postScore(paste, []) : fileGuestScore(paste, preview);
      const personal = saved?.personal || {};
      if (personal.best_all) toast.success('Best all time.');
      else if (personal.best_week) toast.success('Best this week.');
      else toast.success('Saved');
      todayCopyRef.current = undefined;
      loadTodayCopy().catch(() => {});
      setPaste('');
      setPreview(null);
      setPhase('empty');
      if (signedIn && saved?.global_rank != null) toast.success(`Rank ${saved.global_rank}`);
      window.dispatchEvent(new Event(SCORE_POSTED));
      if (onPosted) onPosted(saved);
    } catch (err) {
      setError(err.message || 'Could not post');
    } finally {
      setPending(false);
    }
  };

  actionRef.current = () => {
    if (pending) return;
    if (phase === 'preview') confirm();
    else submit();
  };

  useEffect(() => {
    try {
      if (paste) sessionStorage.setItem(PASTE_KEY, paste);
      else sessionStorage.removeItem(PASTE_KEY);
    } catch {
      /* private mode */
    }
  }, [paste]);

  useEffect(() => {
    let cancelled = false;
    loadTodayCopy().catch(() => {
      if (!cancelled) todayCopyRef.current = undefined;
    });
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' || (!event.metaKey && !event.ctrlKey)) return;
      event.preventDefault();
      actionRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const edit = () => {
    setPhase('empty');
    setError('');
  };

  const report = async () => {
    if (pending) return;
    setPending(true);
    try {
      await reportBug(error || 'Unrecognized result', paste);
      toast.success('Sent');
    } catch (err) {
      toast.error(err.message || 'Could not send');
    } finally {
      setPending(false);
    }
  };

  const copyToday = async () => {
    if (pending) return;
    let text = todayCopyRef.current;
    if (text === undefined) {
      setPending(true);
      try {
        text = await loadTodayCopy();
      } catch (err) {
        toast.error(err.message || 'Could not copy');
        return;
      } finally {
        setPending(false);
      }
    }
    if (!text) {
      toast.error('Nothing filed today.');
      return;
    }
    try {
      await copyText(text);
      toast.success('Copied');
    } catch (err) {
      toast.error(err.message || 'Could not copy');
    }
  };

  return (
    <section data-testid="desk-home" className="w-full animate-fade-up lg:max-w-measure">
      <h1 className="font-masthead text-headline-xl-mobile text-primary text-balance md:text-headline-lg">
        What did you play today?
      </h1>
      {phase === 'empty' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="mt-space-md border border-border-strong bg-background focus-within:border-primary">
            <textarea
              id="result-paste"
              aria-label="Result"
              value={paste}
              onChange={(event) => {
                setPaste(event.target.value);
                if (error) setError('');
              }}
              spellCheck={false}
              autoCapitalize="off"
              rows={3}
              placeholder="copy and paste your score from any daily game here."
              className="w-full resize-none bg-background px-space-sm pt-space-sm font-mono text-base text-primary outline-none"
            />
            <div className="flex items-center gap-space-lg border-t border-border px-space-sm py-space-sm">
              <GameMenu games={games} onOpen={onOpenGame || (() => {})} />
              <button
                type="button"
                aria-label="Copy Today's Score"
                disabled={pending}
                onClick={copyToday}
                className="text-primary hover:text-secondary"
              >
                <CopyMark />
              </button>
              {iosApp() ? (
                <button
                  type="button"
                  aria-label="Share to Instagram"
                  onClick={() => setShareOpen(true)}
                  className="text-primary"
                >
                  <img src={instagramLogo} alt="" className="h-5 w-5 object-contain" />
                </button>
              ) : null}
              <button type="submit" disabled={pending} className={`${inkButtonClass} ml-auto`}>
                Submit
              </button>
            </div>
          </div>
          <PasteError message={error} signedIn={signedIn} onReport={report} />
        </form>
      ) : null}

      {phase === 'preview' && preview ? (
        <form
          className="mt-space-md"
          onSubmit={(event) => {
            event.preventDefault();
            confirm();
          }}
        >
          <div className="border border-border-strong bg-background">
            <div className="px-space-sm pt-space-sm">
              <ResultBlock result={preview} />
            </div>
            <PublishForm pending={pending} error={error} onEdit={edit} />
          </div>
        </form>
      ) : null}
      {shareOpen ? <StoryShare onClose={() => setShareOpen(false)} /> : null}
    </section>
  );
};

export default PasteDesk;
