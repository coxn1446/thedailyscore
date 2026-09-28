import React from 'react';
import { Link } from 'react-router-dom';
import { PlusMark, UnreadMark } from '../Brand/Marks';
import { ordinal, periodDays, submissionRatio } from '../../utils/ordinal';

const standingFor = (group, selectedGame) =>
  group?.standings?.find((row) => row.slug === selectedGame) || null;

const formatStat = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const RANK_COLUMNS = [
  { id: 'daily', label: 'Daily Rank', value: (standing) => standing?.daily_rank },
  { id: 'weekly', label: 'Weekly Rank', value: (standing) => standing?.weekly_rank },
  { id: 'all', label: 'All Time Rank', value: (standing) => standing?.all_time_rank },
];

const statLine = (standing, basis, period) => {
  if (!standing) return [];
  if (period === 'today') {
    return [{ label: basis === 'guesses' ? 'Guesses' : 'Score', value: formatStat(standing.daily_score) }];
  }
  if (period === 'week') {
    const best = formatStat(standing.weekly_best);
    const average = formatStat(standing.weekly_average);
    if (basis === 'guesses') {
      return [
        { label: 'Best', value: best },
        { label: 'Average', value: average },
      ];
    }
    return [
      { label: 'Best', value: best },
      { label: 'Total', value: formatStat(standing.weekly_score) },
      { label: 'Average', value: average },
    ];
  }
  if (basis === 'guesses') {
    const average = period === 'all' ? standing.all_time_average : standing.custom_average;
    return [{ label: 'Average', value: formatStat(average) }];
  }
  if (period === 'all') {
    return [
      { label: 'Best', value: formatStat(standing.all_time_score) },
      { label: 'Average', value: formatStat(standing.all_time_average) },
    ];
  }
  return [
    { label: 'Total', value: formatStat(standing.custom_score) },
    { label: 'Average', value: formatStat(standing.custom_average) },
  ];
};

const submissionsFor = (standing, period) => {
  if (!standing) return 0;
  if (period === 'week') return standing.submissions_week;
  if (period === 'all') return standing.submissions_all;
  if (period === 'custom') return standing.submissions_custom;
  return standing.submissions_today;
};

const GroupDirectory = ({ groups, selectedId, selectedGame, period, from, to, onCharter }) => {
  const basis = groups.map((group) => standingFor(group, selectedGame)?.rank_basis).find(Boolean) || 'score';
  const reader = groups.find((group) => String(group.group_id) === String(selectedId)) || groups[0];
  const stats = statLine(standingFor(reader, selectedGame), basis, period);
  const headerClass = 'pb-space-sm text-right font-sans text-kicker font-normal uppercase tracking-kicker text-muted';
  const cellClass = 'border-b border-border py-space-sm text-right font-mono text-body-md text-primary';

  return (
    <aside data-testid="groups-directory" className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="flex items-center justify-between gap-space-md">
        <h2 className="font-masthead text-headline-lg text-primary">Directory</h2>
        <button
          type="button"
          aria-label="Create a Group"
          onClick={onCharter}
          className="inline-flex border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary"
        >
          <PlusMark />
        </button>
      </div>
      {stats.length ? (
        <dl className="mt-space-md flex flex-wrap gap-space-lg">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-sans text-kicker uppercase tracking-kicker text-muted">{stat.label}</dt>
              <dd className="font-mono text-body-md text-primary">{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-space-md min-h-0 flex-1 overflow-y-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-space-sm text-left font-sans text-kicker font-normal uppercase tracking-kicker text-muted">
              Group
            </th>
            {RANK_COLUMNS.map((column) => (
              <th key={column.id} className={headerClass}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => {
            const selected = String(group.group_id) === String(selectedId);
            const standing = standingFor(group, selectedGame);
            const ratio = submissionRatio(
              submissionsFor(standing, period),
              group.member_count,
              periodDays(period, group.created_at, from, to)
            );
            const params = new URLSearchParams();
            if (selectedGame) params.set('game', selectedGame);
            params.set('period', period || 'today');
            if (period === 'custom' && from) {
              params.set('from', from);
              if (to) params.set('to', to);
            }
            const unread = Number(group.unread_count) > 0;
            return (
              <tr key={group.group_id} className={selected ? 'bg-inset' : undefined}>
                <td className="border-b border-border py-space-sm">
                  <Link
                    to={`/groups/${group.group_id}?${params.toString()}`}
                    aria-current={selected ? 'page' : undefined}
                    className="block min-w-0"
                  >
                    <span className="flex items-center gap-space-sm">
                      {unread ? <UnreadMark className="h-4 w-4 shrink-0" /> : null}
                      <span className={`font-masthead text-headline-md ${unread ? 'text-secondary' : 'text-primary'}`}>{group.name}</span>
                    </span>
                    <span className="mt-space-xs block font-mono text-caption uppercase text-muted">{ratio}</span>
                  </Link>
                </td>
                {RANK_COLUMNS.map((column) => (
                  <td key={column.id} className={cellClass}>
                    {ordinal(column.value(standing))}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </aside>
  );
};

export default GroupDirectory;
