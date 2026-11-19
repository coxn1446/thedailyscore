import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import { CloseMark } from '../Brand/Marks';
import GameLogo from '../Brand/GameLogo';
import { fetchMyGames, saveMyGames } from '../../helpers/profileHelpers';

const GamePicker = ({ onClose, onSaved }) => {
  const [games, setGames] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    fetchMyGames()
      .then((data) => {
        if (!cancelled) setGames(data.games || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load games.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = async (slug) => {
    if (pending) return;
    const next = games.map((game) => (game.slug === slug ? { ...game, enabled: !game.enabled } : game));
    if (!next.some((game) => game.enabled)) {
      setError('Select a game');
      return;
    }
    setPending(true);
    setError('');
    setGames(next);
    try {
      const saved = await saveMyGames(next.filter((game) => game.enabled).map((game) => game.slug));
      setGames(saved.games || next);
      onSaved?.();
      window.dispatchEvent(new Event('ds:games'));
    } catch (err) {
      setGames(games);
      const message = err.message || 'Could not save games.';
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-inset px-margin" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-games-title"
        className="w-full max-w-md border border-primary bg-background p-space-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-space-md">
          <h2 id="select-games-title" className="font-masthead text-headline-md text-primary">Select Your Games</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="text-primary">
            <CloseMark />
          </button>
        </div>
        <ul className="mt-space-lg space-y-space-sm">
          {games.map((game) => (
            <li key={game.slug} className="flex items-center justify-between gap-space-md">
              <span className="flex items-center gap-space-sm font-sans text-body-md text-primary">
                <GameLogo slug={game.slug} />
                {game.name}
              </span>
              <button
                type="button"
                aria-pressed={game.enabled}
                disabled={pending}
                onClick={() => toggle(game.slug)}
                className="relative h-6 w-10 shrink-0 overflow-hidden border border-primary bg-background"
              >
                <span className={`absolute inset-y-0 left-0 w-5 ${game.enabled ? 'translate-x-full bg-secondary' : 'bg-primary'}`} />
                <span className="sr-only">{game.enabled ? 'On' : 'Off'}</span>
              </button>
            </li>
          ))}
        </ul>
        {error ? (
          <p role="alert" className="mt-space-sm font-sans text-body-md text-error">{error}</p>
        ) : null}
        <button type="button" onClick={onClose} className={`${inkButtonClass} mt-space-lg`}>
          Done
        </button>
      </div>
    </div>
  );
};

export default GamePicker;
