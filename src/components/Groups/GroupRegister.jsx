import React from 'react';
import { Link } from 'react-router-dom';
import { ChatMark, GearMark } from '../Brand/Marks';
import { formatPuzzleDay } from '../../utils/relativeTime';
import { formatBestGuesses, formatGuesses, weightExplanation } from '../../helpers/scoreHelpers';
import WeightTip from './WeightTip';
import { ordinal, periodDays, submissionRatio } from '../../utils/ordinal';

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

const emptyBoardTitle = (period) => {
  if (period === 'today') return 'Nothing filed today.';
  return 'Nothing filed.';
};

const singleDayPeriod = (period, from, to) =>
  period === 'today' || (period === 'custom' && Boolean(from) && (to || from) === from);

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
  if (board?.rank_basis === 'guesses') return formatGuesses(entry.guesses, entry.solved, board.guess_cap);
  return formatStat(entry.score);
};

const SummaryBoard = ({ entries, guessCap, game }) => (
  <div className="mt-space-md">
    <div className="grid grid-cols-4 gap-space-sm border-b border-border py-space-sm">
      <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Player</span>
      <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Best</span>
      <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Avg</span>
      <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Played</span>
    </div>
    <ol>
      {entries.map((entry) => {
        const name = entry.display_name || entry.handle;
        const note = entry.possible != null ? `${entry.solves ?? 0}/${entry.possible} solved` : '';
        return (
          <li
            key={`${entry.user_id}-${entry.score_id}`}
            className={`grid grid-cols-4 items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-space-sm">
              <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
              <Portrait entry={entry} />
              <span className="min-w-0 font-sans text-body-md text-primary">
                {name}
                {note ? <span className="block font-mono text-caption text-muted">{note}</span> : null}
              </span>
            </span>
            <span className="text-right font-mono text-body-md text-primary">{formatBestGuesses(entry.best, guessCap)}</span>
            <span className="inline-flex items-center justify-end gap-space-xs text-right font-mono text-body-md text-primary">
              <span>{formatStat(entry.average)}</span>
              <WeightTip text={weightExplanation(game, entry)} />
            </span>
            <span className="text-right font-mono text-body-md text-primary">{entry.played ?? '—'}</span>
          </li>
        );
      })}
    </ol>
  </div>
);

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

const TotalBoard = ({ entries }) => (
  <div className="mt-space-md">
    <div className="flex gap-space-sm border-b border-border py-space-sm">
      <span className="min-w-0 flex-1 font-sans text-kicker uppercase tracking-kicker text-muted">Player</span>
      <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Total</span>
    </div>
    <ol>
      {entries.map((entry) => {
        const name = entry.display_name || entry.handle;
        return (
          <li
            key={`${entry.user_id}-${entry.score_id}`}
            className={`flex items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
          >
            <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
            <Portrait entry={entry} />
            <span className="min-w-0 flex-1 font-sans text-body-md text-primary">{name}</span>
            <span className="font-mono text-body-md text-primary">{formatStat(entry.total ?? entry.score)}</span>
          </li>
        );
      })}
    </ol>
  </div>
);

const AllTimeBoard = ({ entries, game }) => {
  const solvedShare = game?.slug === 'redactle';
  return (
    <div className="mt-space-md">
      <div className="grid grid-cols-4 gap-space-sm border-b border-border py-space-sm">
        <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Player</span>
        <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Average</span>
        <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">{solvedShare ? 'Solved' : 'Multiplier'}</span>
        <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">All time</span>
      </div>
      <ol>
        {entries.map((entry) => {
          const name = entry.display_name || entry.handle;
          return (
            <li
              key={`${entry.user_id}-${entry.score_id}`}
              className={`grid grid-cols-4 items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
            >
              <span className="flex min-w-0 items-center gap-space-sm">
                <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
                <Portrait entry={entry} />
                <span className="min-w-0 font-sans text-body-md text-primary">{name}</span>
              </span>
              <span className="text-right font-mono text-body-md text-primary">{formatStat(entry.average)}</span>
              <span className="text-right font-mono text-body-md text-primary">
                {solvedShare && entry.possible != null
                  ? `${entry.solves ?? 0}/${entry.possible}`
                  : `${formatStat(entry.multiplier)}%`}
              </span>
              <span className="inline-flex items-center justify-end gap-space-xs text-right font-mono text-body-md text-primary">
                <span>{formatStat(entry.weighted ?? entry.score)}</span>
                <WeightTip text={weightExplanation(game, entry)} />
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

const listFor = (board, period, kind) => {
  if (!board) return [];
  if (period === 'week' && kind === 'scores') return board.weekly_scores || board.weekly_entries || [];
  if (period === 'week') return board.weekly_leaderboard || board.weekly_entries || [];
  if (period === 'all' && kind === 'scores') return board.all_time_scores || board.all_time_entries || [];
  if (period === 'all') return board.all_time_leaderboard || board.all_time_entries || [];
  return entriesFor(board, period);
};

const GroupRegister = ({
  detail,
  gameSlug,
  period,
  from,
  to,
  view = '',
  onView,
  unreadCount = 0,
  onOpenParlor,
}) => {
  const { group, games } = detail;
  const game = games.find((row) => row.slug === gameSlug) || null;
  const board = detail.board?.slug === gameSlug ? detail.board : null;
  const leaderboardPeriod = period === 'week' || period === 'all';
  const defaultView = board?.rank_basis === 'guesses' ? 'board' : 'scores';
  const activeView = view === 'scores' || view === 'board' ? view : defaultView;
  const showBoard = leaderboardPeriod && activeView === 'board';
  const entries = showBoard ? listFor(board, period, 'board') : listFor(board, period, 'scores');
  const wordleWeek = showBoard && period === 'week' && board?.rank_basis === 'guesses';
  const pointsWeek = showBoard && period === 'week' && board?.rank_basis !== 'guesses';
  const allTimeBoard = showBoard && period === 'all';
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
          {leaderboardPeriod ? (
            <nav aria-label="Board" className="mt-space-md flex gap-space-lg">
              {[{ id: 'scores', label: 'Scores' }, { id: 'board', label: 'Leaderboard' }].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activeView === item.id}
                  onClick={() => onView?.(item.id)}
                  className={`border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
                    activeView === item.id ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          ) : null}
          {entries.length ? (
            wordleWeek ? <SummaryBoard entries={entries} guessCap={board?.guess_cap} game={board} />
              : pointsWeek ? <TotalBoard entries={entries} />
                : allTimeBoard ? <AllTimeBoard entries={entries} game={board} />
                  : <BoardEntries entries={entries} board={board} />
          ) : (
            <h2 className="mt-space-sm font-masthead text-headline-md text-primary">{emptyBoardTitle(period)}</h2>
          )}
        </>
      )}
    </section>
  );
};

export default GroupRegister;
