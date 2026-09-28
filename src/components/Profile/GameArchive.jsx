import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inkButtonClass, ruleButtonClass } from '../Auth/AuthPageLayout';
import { deleteScore, fetchArchive, formatResult, updateScoreGroups } from '../../helpers/scoreHelpers';

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
  const [selected, setSelected] = useState({});
  const [pendingId, setPendingId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchArchive()
      .then((data) => {
        if (cancelled) return;
        const rows = data.scores || [];
        setScores(rows);
        setSelected(
          Object.fromEntries(rows.map((row) => [row.score_id, new Set(row.groups.map((group) => group.group_id))]))
        );
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) {
          setScores([]);
          setLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = (scoreId, groupId) => {
    setSelected((current) => {
      const next = new Set(current[scoreId] || []);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return { ...current, [scoreId]: next };
    });
  };

  const saveGroups = async (score) => {
    setPendingId(score.score_id);
    try {
      const groups = [...(selected[score.score_id] || [])];
      const data = await updateScoreGroups(score.score_id, groups);
      setScores((current) =>
        current.map((row) => (row.score_id === score.score_id ? { ...row, groups: data.groups } : row))
      );
      toast.success('Saved');
    } catch (err) {
      toast.error(err.message || 'Could not update groups');
    } finally {
      setPendingId(null);
    }
  };

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
            <p className="font-sans text-body-md text-primary">{row.game.name}</p>
            <p className="font-mono text-caption text-muted">{formatLogged(row.logged_at, timeZone)}</p>
          </div>
          <p className="mt-space-xs font-mono text-caption text-muted">#{row.puzzle_number}</p>
          <p className="mt-space-sm font-mono text-headline-md text-primary">{formatResult(row)}</p>
          {row.options.length ? (
            <ul className="mt-space-sm space-y-space-sm">
              {row.options.map((group) => (
                <li key={group.group_id}>
                  <label className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                    <input
                      type="checkbox"
                      checked={(selected[row.score_id] || new Set()).has(group.group_id)}
                      onChange={() => toggle(row.score_id, group.group_id)}
                      className="h-4 w-4 border border-primary"
                    />
                    {group.name}
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-space-md flex gap-space-sm">
            <button
              type="button"
              className={inkButtonClass}
              disabled={pendingId === row.score_id}
              onClick={() => saveGroups(row)}
            >
              Save
            </button>
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
