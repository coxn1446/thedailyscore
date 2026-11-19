import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ruleButtonClass } from '../Auth/AuthPageLayout';
import GameLogo from '../Brand/GameLogo';
import { SCORE_POSTED, deleteScore, fetchArchive, formatMetrics, formatResult } from '../../helpers/scoreHelpers';

const formatLogged = (value, timeZone) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const GameArchive = ({ timeZone }) => {
  const [scores, setScores] = useState([]);
  const [pendingId, setPendingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchArchive()
        .then((data) => {
          if (cancelled) return;
          setScores(data.scores || []);
          setLoaded(true);
        })
        .catch(() => {
          if (!cancelled) {
            setScores([]);
            setLoaded(true);
          }
        });
    };
    load();
    window.addEventListener(SCORE_POSTED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SCORE_POSTED, load);
    };
  }, []);

  const remove = async (scoreId) => {
    setPendingId(scoreId);
    try {
      await deleteScore(scoreId);
      setScores((current) => current.filter((row) => row.score_id !== scoreId));
    } catch (err) {
      toast.error(err.message || 'Could not delete the score');
    } finally {
      setPendingId(null);
    }
  };

  if (!loaded) return null;

  if (!scores.length) {
    return <p className="mt-space-lg font-sans text-body-md text-primary">Nothing filed.</p>;
  }

  return (
    <ul className="mt-space-lg space-y-space-md">
      {scores.map((row) => (
        <li key={row.score_id} className="border border-border bg-inset p-space-sm">
          <div className="flex items-baseline justify-between gap-space-md">
            <p className="flex items-center gap-space-sm font-sans text-body-md text-primary">
              <GameLogo slug={row.game.slug} />
              {row.game.name}
            </p>
            <p className="font-mono text-caption text-muted">{formatLogged(row.logged_at, timeZone)}</p>
          </div>
          <p className="mt-space-xs font-mono text-caption text-muted">#{row.puzzle_number}</p>
          <p className="mt-space-sm font-mono text-headline-md text-primary">{formatResult(row)}</p>
          {formatMetrics(row.duration_seconds, row.hints) ? (
            <p className="font-mono text-caption text-muted">{formatMetrics(row.duration_seconds, row.hints)}</p>
          ) : null}
          <div className="mt-space-md">
            <button
              type="button"
              className={ruleButtonClass}
              disabled={pendingId === row.score_id}
              onClick={() => remove(row.score_id)}
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default GameArchive;
