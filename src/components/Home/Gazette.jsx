import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchGazette } from '../../helpers/scoreHelpers';
import { relativeTime } from '../../utils/relativeTime';

const linkClass =
  'font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';

const markFor = (card) => {
  if (card.rank_basis === 'guesses') {
    if (!card.solved || card.guesses == null) return 'X/6';
    return `${card.guesses}/6`;
  }
  if (card.score == null) return '—';
  return String(card.score);
};

const Gazette = () => {
  const [cards, setCards] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchGazette()
      .then((data) => {
        if (!cancelled) setCards(Array.isArray(data?.cards) ? data.cards : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setCards([]);
          setError(err.message || 'The gazette could not be loaded.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (cards == null && !error) return null;

  return (
    <section data-testid="gazette" className="double-rule mt-space-lg max-w-measure pt-space-lg">
      <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">Today on The Daily Score</p>
      {error ? (
        <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
          {error}
        </p>
      ) : null}
      {cards?.length ? (
        <ul className="mt-space-md space-y-space-lg">
          {cards.map((card) => (
            <li key={card.score_id} data-testid="gazette-card" className="border-b border-border pb-space-md">
              <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">{card.name}</p>
              <div className="mt-space-xs flex items-baseline justify-between gap-space-md">
                <p className="font-sans text-body-md text-primary">{card.display_name || card.handle}</p>
                <p className="font-mono text-body-md text-primary">{markFor(card)}</p>
              </div>
              {card.puzzle_number != null ? (
                <p className="font-mono text-caption text-muted">#{card.puzzle_number}</p>
              ) : null}
              {card.updated_at ? (
                <p className="font-mono text-caption uppercase text-muted">{relativeTime(card.updated_at)}</p>
              ) : null}
              {card.snippet ? (
                <pre className="mt-space-sm overflow-x-auto whitespace-pre-wrap border border-border bg-inset p-space-sm font-mono text-caption text-primary">
                  {card.snippet}
                </pre>
              ) : null}
              {card.groups?.length ? (
                <ul className="mt-space-sm space-y-space-xs">
                  {card.groups.map((group) => (
                    <li key={group.group_id}>
                      <Link
                        to={`/groups/${group.group_id}?game=${encodeURIComponent(card.slug)}&period=today`}
                        className={linkClass}
                      >
                        {group.name}
                      </Link>
                      {group.rank != null ? (
                        <span className="ml-space-sm font-mono text-caption text-muted">Rank {group.rank}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <h2 className="mt-space-sm font-masthead text-headline-md text-primary">Nothing filed today.</h2>
      )}
    </section>
  );
};

export default Gazette;
