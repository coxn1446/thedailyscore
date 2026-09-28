import React from 'react';
import { Link } from 'react-router-dom';
import { ChatMark, GearMark } from '../Brand/Marks';
import { formatPuzzleDay } from '../../utils/relativeTime';
import { ordinal, periodDays, submissionRatio } from '../../utils/ordinal';

const ENTRY_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

const entryWord = (count) => ENTRY_WORDS[count] || String(count);

const Portrait = ({ entry }) => {
  const initial = (entry.display_name || entry.handle || 'R').trim().charAt(0).toUpperCase();
  if (entry.portrait_url) {
    return <img src={entry.portrait_url} alt="" className="portrait h-8 w-8 border border-primary object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="portrait flex h-8 w-8 items-center justify-center border border-primary bg-background font-masthead text-body-md text-primary"
    >
      {initial}
    </span>
  );
};

const periodKicker = (period) => {
  if (period === 'week') return 'This week';
  if (period === 'all') return 'All time';
  if (period === 'custom') return 'Custom';
  return 'Today';
};

const emptyBoardTitle = (game, period) => {
  if (period === 'week' && game?.min_entries) {
    return `${entryWord(game.min_entries)} scores make the board.`;
  }
  if (period === 'today') return 'Nothing filed today.';
  return 'Nothing filed.';
};

const entriesFor = (board, period) => {
  if (!board) return [];
  if (period === 'week') return board.weekly_entries || [];
  if (period === 'all') return board.all_time_entries || [];
  if (period === 'custom') return board.custom_entries || [];
  return board.daily_entries || board.entries || [];
};

const submissionsFor = (board, period) => {
  if (!board) return 0;
  if (period === 'week') return board.submissions_week;
  if (period === 'all') return board.submissions_all;
  if (period === 'custom') return board.submissions_custom;
  return board.submissions_today;
};

const formatStat = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const scoreLabel = (entry, board) => {
  if (board?.rank_basis === 'guesses') {
    return entry.guesses == null ? '—' : `${entry.guesses}/6`;
  }
  return formatStat(entry.score);
};

const BoardEntries = ({ entries, board }) => (
  <ol className="mt-space-md">
    {entries.map((entry) => {
      const name = entry.display_name || entry.handle;
      const when = formatPuzzleDay(entry.played_on);
      return (
        <li
          key={`${entry.score_id ?? entry.user_id}-${entry.puzzle_number ?? 'mark'}-${entry.score ?? entry.guesses ?? ''}`}
          className={`border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
        >
          <div className="flex items-center gap-space-sm">
            <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
            <Portrait entry={entry} />
            <span className="min-w-0 flex-1 font-sans text-body-md text-primary">
              {when ? `${name} - ${when}` : name}
            </span>
            <span className="font-mono text-body-md text-primary">{scoreLabel(entry, board)}</span>
          </div>
          {entry.snippet ? (
            <pre className="mt-space-sm overflow-x-auto whitespace-pre-wrap pl-10 font-mono text-caption text-primary">
              {entry.snippet}
            </pre>
          ) : null}
        </li>
      );
    })}
  </ol>
);

const GroupRegister = ({ detail, gameSlug, period, from, to, unreadCount = 0, onOpenParlor }) => {
  const { group, games } = detail;
  const game = games.find((row) => row.slug === gameSlug) || null;
  const board = detail.board?.slug === gameSlug ? detail.board : null;
  const ratio = submissionRatio(
    submissionsFor(board, period),
    group.member_count,
    periodDays(period, group.created_at, from, to)
  );

  return (
    <section data-testid="group-register" className="max-w-measure">
      <div className="flex items-start justify-between gap-space-md">
        <h1 className="min-w-0 font-masthead text-headline-lg text-primary text-balance">{group.name}</h1>
        <div className="flex shrink-0 gap-space-sm">
          <button
            type="button"
            aria-label="Parlor"
            onClick={onOpenParlor}
            className="relative inline-flex border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary lg:hidden"
          >
            <ChatMark />
            {unreadCount > 0 ? (
              <span className="absolute right-0 top-0 bg-secondary px-space-xs font-mono text-caption text-on-primary">
                {unreadCount > 99 ? '99' : unreadCount}
              </span>
            ) : null}
          </button>
          <Link
            to={`/groups/${group.group_id}/governance`}
            aria-label="Settings"
            className="inline-flex border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary"
          >
            <GearMark />
          </Link>
        </div>
      </div>
      {group.tagline ? (
        <p className="mt-space-sm font-sans text-deck text-muted text-balance">{group.tagline}</p>
      ) : null}
      <p className="mt-space-sm font-mono text-caption uppercase text-muted">
        {ratio}
        {group.archived ? ' · Archived' : ''}
      </p>
      <div className="double-rule mt-space-lg" />
      {!game ? null : !game.enabled || board?.enabled === false ? (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">
          {game.name} is off.
        </h2>
      ) : (
        <>
          <p className="mt-space-lg font-sans text-kicker uppercase tracking-kicker text-secondary">
            {periodKicker(period)}
          </p>
          {entriesFor(board, period).length ? (
            <BoardEntries entries={entriesFor(board, period)} board={board} />
          ) : (
            <h2 className="mt-space-sm font-masthead text-headline-md text-primary">{emptyBoardTitle(game, period)}</h2>
          )}
        </>
      )}
    </section>
  );
};

export default GroupRegister;
