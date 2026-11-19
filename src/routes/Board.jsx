import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarMark } from '../components/Brand/Marks';
import GameLogo from '../components/Brand/GameLogo';
import BoardRegister from '../components/Board/BoardRegister';
import Loading from '../components/Loading/Loading';
import { fetchBoard } from '../helpers/boardHelpers';
import { SCORE_POSTED } from '../helpers/scoreHelpers';

const PERIODS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'Week' },
  { id: 'all', label: 'All time' },
  { id: 'custom', label: 'Custom' },
];

const SCOPES = [
  { id: 'global', label: 'Global' },
  { id: 'friends', label: 'Friends' },
];

const tabClass = (active) =>
  `inline-flex items-center gap-space-sm border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const Board = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedGame = searchParams.get('game') || '';
  const period = PERIODS.some((item) => item.id === searchParams.get('period'))
    ? searchParams.get('period')
    : 'today';
  const scope = searchParams.get('scope') === 'friends' ? 'friends' : 'global';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const view = searchParams.get('view') === 'scores' || searchParams.get('view') === 'board'
    ? searchParams.get('view')
    : '';
  const [payload, setPayload] = useState(null);
  const [loadError, setLoadError] = useState('');
  const gameRow = useRef(null);

  const choose = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'period' && value !== 'custom') {
      next.delete('from');
      next.delete('to');
    }
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      setLoadError('');
      fetchBoard({
        game: selectedGame,
        scope: scope === 'friends' ? 'friends' : 'global',
        from: period === 'custom' ? from : '',
        to: period === 'custom' ? (to || from) : '',
      })
        .then((data) => {
          if (!cancelled) setPayload(data);
        })
        .catch((err) => {
          if (!cancelled) setLoadError(err.message || 'Could not load the board.');
        });
    };
    load();
    window.addEventListener(SCORE_POSTED, load);
    return () => {
      cancelled = true;
      window.removeEventListener(SCORE_POSTED, load);
    };
  }, [selectedGame, scope, period, from, to]);

  useEffect(() => {
    if (!payload || selectedGame) return undefined;
    const played = payload.standings?.find((row) => row.daily_rank != null || row.weekly_rank != null || row.all_time_rank != null);
    const slug = played?.slug || payload.games?.[0]?.slug;
    if (!slug) return undefined;
    const next = new URLSearchParams(searchParams);
    next.set('game', slug);
    if (!next.get('period')) next.set('period', period);
    setSearchParams(next, { replace: true });
    return undefined;
  }, [payload, selectedGame, searchParams, setSearchParams, period]);

  const games = payload?.games || [];

  useEffect(() => {
    const row = gameRow.current;
    if (!row || !selectedGame) return;
    const current = row.querySelector('[aria-pressed="true"]');
    if (!current) return;
    const start = current.getBoundingClientRect().left - row.getBoundingClientRect().left + row.scrollLeft;
    const end = start + current.offsetWidth;
    if (start < row.scrollLeft) row.scrollLeft = start;
    else if (end > row.scrollLeft + row.clientWidth) row.scrollLeft = end - row.clientWidth;
  }, [selectedGame, games.length]);

  useEffect(() => {
    const row = gameRow.current;
    if (!row) return undefined;
    let originX = 0;
    let originY = 0;
    let originLeft = 0;
    let axis = '';
    let suppressClick = false;
    const begin = (event) => {
      if (event.touches.length !== 1) return;
      originX = event.touches[0].clientX;
      originY = event.touches[0].clientY;
      originLeft = row.scrollLeft;
      axis = '';
    };
    const drag = (event) => {
      if (event.touches.length !== 1) return;
      const dx = event.touches[0].clientX - originX;
      const dy = event.touches[0].clientY - originY;
      if (!axis && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (!axis) axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
      if (axis !== 'x') return;
      row.scrollLeft = originLeft - dx;
      if (Math.abs(dx) > 8) suppressClick = true;
      event.preventDefault();
    };
    const finish = () => {
      axis = '';
    };
    const swallowClick = (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
    };
    row.addEventListener('touchstart', begin, { passive: true });
    row.addEventListener('touchmove', drag, { passive: false });
    row.addEventListener('touchend', finish);
    row.addEventListener('touchcancel', finish);
    row.addEventListener('click', swallowClick, true);
    return () => {
      row.removeEventListener('touchstart', begin);
      row.removeEventListener('touchmove', drag);
      row.removeEventListener('touchend', finish);
      row.removeEventListener('touchcancel', finish);
      row.removeEventListener('click', swallowClick, true);
    };
  }, [games.length]);
  const standing = (payload?.standings || []).find((row) => row.slug === selectedGame) || null;
  const board = payload?.board?.slug === selectedGame ? payload.board : null;

  return (
    <div data-testid="desk-board" className="flex h-full min-h-0 flex-1 flex-col border-t-2 border-primary pt-space-md">
      <div className="flex shrink-0 flex-col gap-space-md">
        {games.length ? (
          <nav ref={gameRow} aria-label="Games" className="w-full min-w-0 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-module">
            <div className="flex w-max gap-space-lg px-space-md py-space-sm">
              {games.map((game) => (
                <button
                  key={game.slug}
                  type="button"
                  aria-pressed={game.slug === selectedGame}
                  onClick={() => choose('game', game.slug)}
                  className={`${tabClass(game.slug === selectedGame)} shrink-0 whitespace-nowrap`}
                >
                  <GameLogo slug={game.slug} />
                  {game.name}
                </button>
              ))}
            </div>
          </nav>
        ) : null}
        <div className="flex flex-col gap-space-md bg-inset px-space-md py-space-sm">
          <nav aria-label="Time period" className="flex flex-wrap gap-space-lg">
            {PERIODS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={item.id === period}
                onClick={() => choose('period', item.id)}
                className={tabClass(item.id === period)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          {period === 'custom' ? (
            <div className="flex gap-space-sm">
              <label className="font-sans text-kicker uppercase tracking-kicker text-muted">
                <span className="flex items-center gap-space-xs">
                  <CalendarMark className="h-4 w-4" />
                  From
                </span>
                <input
                  type="date"
                  value={from}
                  onChange={(event) => choose('from', event.target.value)}
                  className="mt-space-xs block border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary"
                />
              </label>
              <label className="font-sans text-kicker uppercase tracking-kicker text-muted">
                <span className="flex items-center gap-space-xs">
                  <CalendarMark className="h-4 w-4" />
                  To
                </span>
                <input
                  type="date"
                  value={to}
                  onChange={(event) => choose('to', event.target.value)}
                  className="mt-space-xs block border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary"
                />
              </label>
            </div>
          ) : null}
        </div>
        <nav aria-label="Board scope" className="flex gap-space-lg">
          {SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={scope === item.id}
              onClick={() => choose('scope', item.id === 'global' ? '' : item.id)}
              className={tabClass(scope === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
      {loadError ? (
        <p role="alert" className="mt-space-lg font-sans text-body-md text-error">{loadError}</p>
      ) : null}
      {!payload && !loadError ? <Loading /> : null}
      {payload && selectedGame ? (
        <BoardRegister
          board={board}
          standing={standing}
          period={period}
          view={view}
          onView={(next) => choose('view', next)}
        />
      ) : null}
      </div>
    </div>
  );
};

export default Board;
