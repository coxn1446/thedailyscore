import React, { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import { CloseMark, GripMark } from '../Brand/Marks';
import GameLogo from '../Brand/GameLogo';
import { guestGameList, saveGuestGames } from '../../helpers/guestCache';
import { fetchMyGames, saveMyGames } from '../../helpers/profileHelpers';
import { selectIsAuthenticated } from '../../store/auth.reducer';

export const reorderGames = (games, fromSlug, toSlug) => {
  const from = games.findIndex((game) => game.slug === fromSlug);
  const to = games.findIndex((game) => game.slug === toSlug);
  if (from < 0 || to < 0 || from === to) return games;
  const next = [...games];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const GamePicker = ({ onClose, onSaved }) => {
  const signedIn = useSelector(selectIsAuthenticated);
  const [games, setGames] = useState([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState('');
  const [ghost, setGhost] = useState(null);
  const gamesRef = useRef([]);
  const dragRef = useRef(null);
  const listRef = useRef(null);
  const ghostRef = useRef(null);
  gamesRef.current = games;

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (!signedIn) {
      setGames(guestGameList());
      return undefined;
    }
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
  }, [signedIn]);

  const persist = async (next, previous = games) => {
    if (!next.some((game) => game.enabled)) {
      setError('Select a game');
      return;
    }
    setPending(true);
    setError('');
    setGames(next);
    const payload = next.map((game) => ({ slug: game.slug, enabled: game.enabled }));
    if (!signedIn) {
      const saved = saveGuestGames(payload);
      setGames(saved.games || next);
      onSaved?.();
      window.dispatchEvent(new Event('ds:games'));
      setPending(false);
      return;
    }
    try {
      const saved = await saveMyGames(payload);
      setGames(saved.games || next);
      onSaved?.();
      window.dispatchEvent(new Event('ds:games'));
    } catch (err) {
      setGames(previous);
      const message = err.message || 'Could not save games.';
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  const toggle = (slug) => {
    if (pending) return;
    const next = games.map((game) => (game.slug === slug ? { ...game, enabled: !game.enabled } : game));
    persist(next);
  };

  const placeDrag = (clientY) => {
    const drag = dragRef.current;
    const list = listRef.current;
    if (!drag || !list) return;
    const target = [...list.querySelectorAll('li[data-slug]')].find((item) => {
      const box = item.getBoundingClientRect();
      return clientY >= box.top && clientY < box.bottom;
    });
    if (!target || target.dataset.slug === drag.slug) return;
    const next = reorderGames(gamesRef.current, drag.slug, target.dataset.slug);
    if (next === gamesRef.current) return;
    gamesRef.current = next;
    drag.moved = true;
    setGames(next);
  };

  const placeGhost = (x, y) => {
    const node = ghostRef.current;
    if (!node || x == null || y == null) return;
    node.style.transform = `translate(${x + 12}px, ${y + 12}px)`;
  };

  useEffect(() => {
    if (!ghost || !dragRef.current) return;
    placeGhost(dragRef.current.x, dragRef.current.y);
  }, [ghost]);

  const endDrag = () => {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragging('');
    setGhost(null);
    if (drag?.moved) persist(gamesRef.current, drag.origin);
  };

  const startDrag = (event, slug) => {
    if (pending || dragRef.current) return;
    event.preventDefault();
    const game = gamesRef.current.find((item) => item.slug === slug);
    dragRef.current = { slug, moved: false, origin: gamesRef.current, x: event.clientX, y: event.clientY };
    setDragging(slug);
    setGhost(game ? { slug: game.slug, name: game.name } : null);
    const move = (pointer) => {
      const point = pointer.clientY;
      if (dragRef.current) {
        dragRef.current.x = pointer.clientX;
        dragRef.current.y = pointer.clientY;
      }
      placeGhost(pointer.clientX, pointer.clientY);
      if (point == null) return;
      placeDrag(point);
    };
    const finish = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      endDrag();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
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
        <ul ref={listRef} className="mt-space-lg space-y-space-sm">
          {games.map((game) => (
            <li key={game.slug} data-slug={game.slug} className={`flex items-center gap-space-md ${dragging === game.slug ? 'bg-inset' : ''}`}>
              <button
                type="button"
                aria-label={`Reorder ${game.name}`}
                disabled={pending}
                onPointerDown={(event) => startDrag(event, game.slug)}
                className="cursor-grab touch-none text-muted hover:text-primary active:cursor-grabbing"
              >
                <GripMark />
              </button>
              <span className="flex min-w-0 flex-1 items-center gap-space-sm font-sans text-body-md text-primary">
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
      {ghost ? (
        <div
          ref={ghostRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-0 top-0 z-50 flex items-center gap-space-sm border border-primary bg-background px-space-sm py-space-xs"
        >
          <GameLogo slug={ghost.slug} />
          <span className="font-sans text-body-md text-primary">{ghost.name}</span>
        </div>
      ) : null}
    </div>
  );
};

export default GamePicker;
