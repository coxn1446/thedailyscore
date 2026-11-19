import { formatPuzzleDay } from '../utils/relativeTime';
import { apiJson } from './sessionClient';

const request = (url, options = {}) => apiJson(url, options);

export const SCORE_POSTED = 'ds:score';

export const previewScore = (paste) =>
  request('/api/scores/preview', { method: 'POST', body: JSON.stringify({ paste }) });

export const postScore = (paste, groups, imageUrl) => {
  const body = groups === undefined ? { paste } : { paste, groups };
  if (imageUrl) body.image_url = imageUrl;
  return request('/api/scores', {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const fetchBests = () => request('/api/scores/bests');

export const fetchGazette = () => request('/api/scores/gazette');

export const fetchLoggedToday = () => request('/api/scores/logged-today');

export const fetchTodayScores = () => request('/api/scores/today');

export const fetchRecap = (period) => request(`/api/scores/recap?period=${period === 'week' ? 'week' : 'today'}`);

export const formatDuration = (seconds) => {
  if (seconds == null || Number.isNaN(Number(seconds))) return '';
  const total = Math.max(0, Math.round(Number(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const clock = `${minutes}m${String(secs).padStart(2, '0')}s`;
  return hours ? `${hours}h${clock}` : clock;
};

export const formatHints = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '';
  const num = Number(value);
  const shown = Number.isInteger(num) ? String(num) : num.toFixed(1);
  return `${shown} ${shown === '1' ? 'hint' : 'hints'}`;
};

export const formatMetrics = (durationSeconds, hints) => {
  const parts = [];
  if (durationSeconds != null && !Number.isNaN(Number(durationSeconds))) parts.push(formatDuration(durationSeconds));
  if (hints != null && !Number.isNaN(Number(hints))) parts.push(formatHints(hints));
  return parts.join(' · ');
};

export const formatGuesses = (guesses, solved, guessCap = 6) => {
  if (guessCap == null) {
    if (guesses == null || Number.isNaN(Number(guesses))) return '—';
    const num = Number(guesses);
    return Number.isInteger(num) ? String(num) : num.toFixed(1);
  }
  if (solved === false || guesses == null || Number.isNaN(Number(guesses))) return `X/${guessCap}`;
  const num = Number(guesses);
  const shown = Number.isInteger(num) ? String(num) : num.toFixed(1);
  return `${shown}/${guessCap}`;
};

export const formatBestGuesses = (value, guessCap = 6) => {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return formatGuesses(value, true, guessCap);
};

const capOf = (row) => {
  if (row?.game && Object.prototype.hasOwnProperty.call(row.game, 'guess_cap')) return row.game.guess_cap;
  if (row && Object.prototype.hasOwnProperty.call(row, 'guess_cap')) return row.guess_cap;
  return undefined;
};

export const formatScore = (value) => {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '';
  const num = Math.round(Number(value) * 100) / 100;
  if (!Number.isFinite(num)) return '';
  if (Number.isInteger(num)) return String(num);
  const text = num.toFixed(2);
  return text.endsWith('0') ? num.toFixed(1) : text;
};

const markOf = (row) => {
  if (row?.rank_basis === 'guesses') return formatGuesses(row.guesses, row.solved, capOf(row));
  return formatScore(row?.score);
};

const shareLine = (row) => {
  const mark = markOf(row);
  const snippet = typeof row?.snippet === 'string' ? row.snippet.trim() : '';
  if (row?.slug === 'noillirk') {
    const altitude = mark ? `${mark}m` : '';
    return snippet && altitude ? `${snippet}\n${altitude}` : altitude || snippet;
  }
  if ((row?.slug === 'krillion' || row?.slug === 'map-tap' || row?.slug === 'time-guesser' || row?.slug === 'farflung' || row?.slug === 'eraly' || row?.slug === 'fermi' || row?.slug === 'hivemind') && snippet) {
    return `${snippet}\n${mark}`;
  }
  return mark;
};

const textLink = (url) => {
  const bare = String(url).replace(/^\.+/, '').replace(/\.+$/, '');
  return `.${bare}.`;
};

// Periods on both sides stop Messages from turning the address into a preview.
const concealLinkPreviews = (text) => text.replace(/https?:\/\/[^\s]+/gi, (token) => {
  const tail = token.match(/[)\]>,]+$/)?.[0] ?? '';
  const url = token.slice(0, token.length - tail.length);
  return `${textLink(url)}${tail}`;
});

export const formatTodayCopy = ({ on, scores } = {}) => {
  const date = formatPuzzleDay(on);
  const header = date ? `The Daily Score | ${date}` : 'The Daily Score';
  const blocks = (scores || []).map((row) => `${row.name}\n${shareLine(row)}`);
  return concealLinkPreviews([header, ...blocks, 'https://thedailyscore.site'].join('\n\n'));
};

export const fetchArchive = () => request('/api/scores/archive');

export const deleteScore = (scoreId) => request(`/api/scores/${scoreId}`, { method: 'DELETE' });

export const updateScoreGroups = (scoreId, groups) =>
  request(`/api/scores/${scoreId}/groups`, {
    method: 'PATCH',
    body: JSON.stringify({ groups }),
  });

const onePlace = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  const rounded = Math.round(num * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const percentPlace = (value) => `${(Math.round(Number(value) * 10) / 10).toFixed(1)}%`;

export const weightExplanation = (game = {}, entry = null) => {
  if (game.slug === 'redactle') {
    const solves = Number(entry?.solves);
    const attempts = solves + (Number(entry?.gave_up) || 0);
    const possible = Number(entry?.possible);
    const average = entry?.average;
    if (average != null && entry?.attempt_percent != null && entry?.solve_percent != null) {
      return `Average of solved puzzles (${onePlace(average)}) * attempt percentage (${percentPlace(entry.attempt_percent)}) * solve percentage (${percentPlace(entry.solve_percent)})`;
    }
    if (average != null && solves > 0 && attempts > 0 && possible > 0) {
      const attempt = (possible / attempts) * 100;
      const solve = (attempts / solves) * 100;
      return `Average of solved puzzles (${onePlace(average)}) * attempt percentage (${percentPlace(attempt)}) * solve percentage (${percentPlace(solve)})`;
    }
    return 'Average of solved puzzles * attempt percentage * solve percentage.';
  }
  if (game.slug === 'fermi') {
    return 'Average multiple. Lower is better. Above 75% of days multiplies by 1, from 50% through 75% by 1.25, from 25% up to 50% by 1.5, and under 25% by 2.';
  }
  if (game.slug === 'wordle' || game.rank_basis === 'guesses') {
    return 'Average guesses. A miss counts as 7. The days run from when this game was turned on. Above 75% multiplies by 1, from 50% through 75% by 1.25, from 25% up to 50% by 1.5, and under 25% by 2.';
  }
  return 'Average score times the share of days filed since this game was turned on.';
};

export const formatResult = (result) => {
  const basis = result?.game?.rank_basis || result?.rank_basis;
  if (basis === 'guesses') return formatGuesses(result.guesses, result.solved, capOf(result));
  const mark = formatScore(result?.score);
  if ((result?.game?.slug || result?.slug) === 'noillirk') return mark ? `${mark}m` : '';
  return mark;
};
