import React from 'react';
import { Link } from 'react-router-dom';
import GameLogo from '../Brand/GameLogo';
import { formatBestGuesses, formatGuesses, formatScore, weightExplanation } from '../../helpers/scoreHelpers';
import WeightTip from '../Groups/WeightTip';
import { formatPuzzleDay } from '../../utils/relativeTime';
import { ordinal } from '../../utils/ordinal';

const Portrait = ({ entry }) => {
  const initial = (entry.display_name || entry.handle || 'R').trim().charAt(0).toUpperCase();
  if (entry.portrait_url) {
    return <img src={entry.portrait_url} alt="" className="portrait h-8 w-8 shrink-0 border border-primary object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="portrait flex h-8 w-8 shrink-0 items-center justify-center border border-primary bg-background font-masthead text-body-md text-primary"
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

const PlayerIdentity = ({ entry, suffix }) => {
  const name = entry.display_name || entry.handle;
  return (
    <span className="min-w-0 font-sans text-body-md text-primary">
      <Link
        to={entry.mine || !entry.handle ? '/profile' : `/profile/${entry.handle}`}
        className="underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary"
      >
        {name}
      </Link>
      {suffix ? ` - ${suffix}` : null}
    </span>
  );
};

const formatStat = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const shownScore = (value, slug) => (slug === 'fermi' ? (formatScore(value) || '—') : formatStat(value));

const scoreLabel = (entry, board) => {
  if (board?.rank_basis === 'guesses') return formatGuesses(entry.guesses, entry.solved, board.guess_cap);
  return shownScore(entry.score, board?.slug);
};

const entriesFor = (board, period) => {
  if (!board) return [];
  if (period === 'week') return board.weekly_entries || [];
  if (period === 'all') return board.all_time_entries || [];
  if (period === 'custom') return board.custom_entries || [];
  return board.daily_entries || board.entries || [];
};

const listFor = (board, period, kind) => {
  if (!board) return [];
  if (period === 'week' && kind === 'scores') return board.weekly_scores || board.weekly_entries || [];
  if (period === 'week') return board.weekly_leaderboard || board.weekly_entries || [];
  if (period === 'all' && kind === 'scores') return board.all_time_scores || board.all_time_entries || [];
  if (period === 'all') return board.all_time_leaderboard || board.all_time_entries || [];
  return entriesFor(board, period);
};

const rankOf = (standing, period) => {
  if (!standing) return null;
  if (period === 'week') return standing.weekly_rank;
  if (period === 'all') return standing.all_time_rank;
  if (period === 'custom') return standing.custom_rank;
  return standing.daily_rank;
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
        const note = entry.possible != null ? `${entry.solves ?? 0}/${entry.possible} solved` : '';
        return (
          <li
            key={`${entry.user_id}-${entry.score_id}`}
            className={`grid grid-cols-4 items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-space-sm">
              <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
              <Portrait entry={entry} />
              <span className="min-w-0">
                <PlayerIdentity entry={entry} />
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
      const when = formatPuzzleDay(entry.played_on);
      return (
        <li
          key={`${entry.score_id ?? entry.user_id}-${entry.puzzle_number ?? 'mark'}-${entry.score ?? entry.guesses ?? ''}`}
          className={`border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
        >
          <div className="flex items-center gap-space-sm">
            <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
            <Portrait entry={entry} />
            <span className="min-w-0 flex-1">
              <PlayerIdentity entry={entry} suffix={when} />
            </span>
            <span className="font-mono text-body-md text-primary">{scoreLabel(entry, board)}</span>
          </div>
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
      {entries.map((entry) => (
        <li
          key={`${entry.user_id}-${entry.score_id}`}
          className={`flex items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
        >
          <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
          <Portrait entry={entry} />
          <span className="min-w-0 flex-1"><PlayerIdentity entry={entry} /></span>
          <span className="font-mono text-body-md text-primary">{formatStat(entry.total ?? entry.score)}</span>
        </li>
      ))}
    </ol>
  </div>
);

const allTimeTip = (game, entry) => {
  const base = weightExplanation(game, entry);
  if (game?.slug === 'redactle' || entry?.multiplier == null) return base;
  return `${base} Multiplier ${formatStat(entry.multiplier)}%.`;
};

const AllTimeBoard = ({ entries, game, mark = 'All time' }) => {
  const solvedShare = game?.slug === 'redactle';
  const columns = solvedShare ? 'grid-cols-4' : 'grid-cols-3';
  return (
    <div className="mt-space-md">
      <div className={`${columns} grid gap-space-sm border-b border-border py-space-sm`}>
        <span className="font-sans text-kicker uppercase tracking-kicker text-muted">Player</span>
        <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Average</span>
        {solvedShare ? (
          <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">Solved</span>
        ) : null}
        <span className="text-right font-sans text-kicker uppercase tracking-kicker text-muted">{mark}</span>
      </div>
      <ol>
        {entries.map((entry) => (
          <li
            key={`${entry.user_id}-${entry.score_id}`}
            className={`${columns} grid items-center gap-space-sm border-b border-border py-space-sm ${entry.mine ? 'bg-inset' : ''}`}
          >
            <span className="flex min-w-0 items-center gap-space-sm">
              <span className="w-10 shrink-0 font-mono text-body-md text-primary">{ordinal(entry.rank)}</span>
              <Portrait entry={entry} />
              <PlayerIdentity entry={entry} />
            </span>
            <span className="text-right font-mono text-body-md text-primary">{shownScore(entry.average, game?.slug)}</span>
            {solvedShare ? (
              <span className="text-right font-mono text-body-md text-primary">
                {entry.possible != null ? `${entry.solves ?? 0}/${entry.possible}` : '—'}
              </span>
            ) : null}
            <span className="inline-flex items-center justify-end gap-space-xs text-right font-mono text-body-md text-primary">
              <span>{shownScore(entry.weighted ?? entry.score, game?.slug)}</span>
              <WeightTip text={allTimeTip(game, entry)} />
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};

const tabClass = (active) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    active ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const BoardRegister = ({ board, standing, period, view = '', onView }) => {
  const leaderboardPeriod = period === 'week' || period === 'all';
  const defaultView = board?.rank_basis === 'guesses' ? 'board' : 'scores';
  const activeView = view === 'scores' || view === 'board' ? view : defaultView;
  const showBoard = leaderboardPeriod && activeView === 'board';
  const entries = showBoard ? listFor(board, period, 'board') : listFor(board, period, 'scores');
  const wordleWeek = showBoard && period === 'week' && board?.rank_basis === 'guesses';
  const fermiWeek = showBoard && period === 'week' && board?.slug === 'fermi';
  const pointsWeek = showBoard && period === 'week' && board?.rank_basis !== 'guesses' && !fermiWeek;
  const allTimeBoard = showBoard && period === 'all';
  const mine = rankOf(standing, period);

  return (
    <section data-testid="board-register" className="mt-space-lg max-w-measure">
      <div className="flex items-center gap-space-sm">
        <GameLogo slug={board?.slug} className="h-8 w-8" />
        <h1 className="font-masthead text-headline-lg text-primary text-balance">{board?.name || 'Board'}</h1>
      </div>
      {mine != null ? (
        <p className="mt-space-sm font-mono text-body-md text-primary">{ordinal(mine)}</p>
      ) : null}
      <div className="double-rule mt-space-lg" />
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
              className={tabClass(activeView === item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      ) : null}
      {entries.length ? (
        wordleWeek ? <SummaryBoard entries={entries} guessCap={board?.guess_cap} game={board} />
          : fermiWeek ? <AllTimeBoard entries={entries} game={board} mark="Score" />
            : pointsWeek ? <TotalBoard entries={entries} />
              : allTimeBoard ? <AllTimeBoard entries={entries} game={board} />
                : <BoardEntries entries={entries} board={board} />
      ) : (
        <h2 className="mt-space-sm font-masthead text-headline-md text-primary">{emptyBoardTitle(period)}</h2>
      )}
    </section>
  );
};

export default BoardRegister;
