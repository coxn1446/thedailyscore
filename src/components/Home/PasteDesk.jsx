import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { fieldClass, inkButtonClass } from '../Auth/AuthPageLayout';
import PublishForm from './PublishForm';
import { formatResult, postScore, previewScore } from '../../helpers/scoreHelpers';

const linkClass =
  'font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';

const ResultBlock = ({ result }) => (
  <div>
    <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">{result.game.name}</p>
    <p className="mt-space-xs font-mono text-caption text-muted">#{result.puzzle_number}</p>
    <p className="mt-space-sm font-mono text-headline-md text-primary">{formatResult(result)}</p>
    {result.snippet ? (
      <pre className="mt-space-md overflow-x-auto whitespace-pre-wrap border border-border bg-inset p-space-sm font-mono text-caption text-primary">
        {result.snippet}
      </pre>
    ) : null}
  </div>
);

const PostedGroups = ({ groups }) => {
  if (!groups.length) return null;
  return (
    <ul className="mt-space-lg space-y-space-sm">
      {groups.map((group) => (
        <li key={group.group_id}>
          <Link to={`/groups/${group.group_id}`} className={linkClass}>
            {group.name}
          </Link>
          <p className="font-mono text-caption text-muted">
            {group.rank == null ? 'Unranked' : `Rank ${group.rank}`}
          </p>
        </li>
      ))}
    </ul>
  );
};

const PasteError = ({ message }) => {
  if (!message) return null;
  if (message === 'Unrecognized result') {
    return (
      <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
        Game not recognized.{' '}
        <Link to="/request-game" className={linkClass}>
          Submit a request?
        </Link>
      </p>
    );
  }
  return (
    <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
      {message}
    </p>
  );
};

const PasteDesk = () => {
  const [phase, setPhase] = useState('empty');
  const [paste, setPaste] = useState('');
  const [preview, setPreview] = useState(null);
  const [posted, setPosted] = useState(null);
  const [selectedGroups, setSelectedGroups] = useState(() => new Set());
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const actionRef = useRef(() => {});

  const submit = async () => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const data = await previewScore(paste);
      setPreview(data);
      setSelectedGroups(new Set((data.groups || []).map((group) => group.group_id)));
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
      await postScore(paste, [...selectedGroups]);
      toast.success('Saved');
      reset();
    } catch (err) {
      setError(err.message || 'Could not post');
    } finally {
      setPending(false);
    }
  };

  actionRef.current = () => {
    if (pending || phase === 'posted') return;
    if (phase === 'preview') confirm();
    else submit();
  };

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

  const reset = () => {
    setPaste('');
    setPreview(null);
    setPosted(null);
    setError('');
    setPhase('empty');
  };

  return (
    <section data-testid="desk-home" className="w-full animate-fade-up lg:max-w-measure">
      {phase === 'empty' ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <h1 className="font-masthead text-headline-xl-mobile text-primary text-balance md:text-headline-lg">
            What did you play today?
          </h1>
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
            rows={8}
            placeholder="copy and paste your score from any daily game here."
            className={`${fieldClass} font-mono`}
          />
          <PasteError message={error} />
          <button type="submit" disabled={pending} className={`${inkButtonClass} mt-space-md w-full justify-center lg:w-auto`}>
            Submit
          </button>
        </form>
      ) : null}

      {phase === 'preview' && preview ? (
        <div>
          <ResultBlock result={preview} />
          <PublishForm
            groups={preview.groups || []}
            selected={selectedGroups}
            pending={pending}
            error={error}
            onSubmit={confirm}
            onEdit={edit}
            onToggle={(groupId) => {
              setSelectedGroups((current) => {
                const next = new Set(current);
                if (next.has(groupId)) next.delete(groupId);
                else next.add(groupId);
                return next;
              });
            }}
            onToggleAll={() => {
              const groups = preview.groups || [];
              const allOn = groups.length > 0 && groups.every((group) => selectedGroups.has(group.group_id));
              setSelectedGroups(allOn ? new Set() : new Set(groups.map((group) => group.group_id)));
            }}
          />
        </div>
      ) : null}

      {phase === 'posted' && posted ? (
        <div>
          <ResultBlock result={posted} />
          <PostedGroups groups={posted.groups || []} />
          <button type="button" onClick={reset} className={`${inkButtonClass} mt-space-lg`}>
            Paste another
          </button>
        </div>
      ) : null}
    </section>
  );
};

export default PasteDesk;
