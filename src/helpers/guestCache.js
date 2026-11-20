import { GAME_LINKS } from './gameCatalog';
import { clientTimezone } from './identity';
import { formatResult } from './scoreHelpers';
import { cacheDelete, cacheGet, cacheSet } from '../utils/sessionCache';

export const GUEST_KEY = 'guest';
export const GUEST_IMPORT_KEY = 'ds:guest-import';
const SCORE_LIMIT = 200;
const DUPLICATE = "you've already uploaded this score";

const empty = () => ({
  night_mode: false,
  games: null,
  order: null,
  scores: [],
});

export const readGuest = () => {
  const saved = cacheGet(GUEST_KEY);
  if (!saved || typeof saved !== 'object') return empty();
  return {
    night_mode: saved.night_mode === true,
    games: Array.isArray(saved.games) ? saved.games.filter((slug) => typeof slug === 'string') : null,
    order: Array.isArray(saved.order) ? saved.order.filter((slug) => typeof slug === 'string') : null,
    scores: Array.isArray(saved.scores) ? saved.scores : [],
  };
};

const writeGuest = (next) => {
  cacheSet(GUEST_KEY, next);
  return next;
};

export const guestNight = () => readGuest().night_mode === true;

export const setGuestNight = (on) => {
  const current = readGuest();
  writeGuest({ ...current, night_mode: on === true });
};

export const clearGuest = () => {
  cacheDelete(GUEST_KEY);
};

export const guestPastes = () => readGuest().scores.map((row) => row.paste).filter(Boolean);

export const guestEnabledSlugs = () => {
  const games = readGuest().games;
  if (!Array.isArray(games)) return null;
  return new Set(games);
};

const enabledRow = (row) => {
  const enabled = guestEnabledSlugs();
  const slug = row?.game?.slug || row?.slug;
  return !enabled || enabled.has(slug);
};

export const guestGameOrder = () => {
  const slugs = GAME_LINKS.map((game) => game.slug);
  const order = readGuest().order;
  if (!order?.length) return slugs;
  const known = new Set(slugs);
  const ranked = order.filter((slug) => known.has(slug));
  for (const slug of slugs) {
    if (!ranked.includes(slug)) ranked.push(slug);
  }
  return ranked;
};

const byGuestOrder = (games) => {
  const rank = new Map(guestGameOrder().map((slug, index) => [slug, index]));
  return [...games].sort((a, b) => (rank.get(a.slug) ?? rank.size) - (rank.get(b.slug) ?? rank.size));
};

export const guestGameList = () => {
  const enabled = guestEnabledSlugs();
  return byGuestOrder(GAME_LINKS.map((game) => ({
    slug: game.slug,
    name: game.name,
    enabled: !enabled || enabled.has(game.slug),
  })));
};

export const guestHomeGames = () => {
  const enabled = guestEnabledSlugs();
  if (!enabled) return byGuestOrder(GAME_LINKS);
  return byGuestOrder(GAME_LINKS.filter((game) => enabled.has(game.slug)));
};

export const saveGuestGames = (input) => {
  const current = readGuest();
  const entries = Array.isArray(input) ? input : [];
  const objects = entries.length > 0 && typeof entries[0] === 'object' && entries[0] !== null;
  if (!objects) {
    writeGuest({ ...current, games: entries.filter((slug) => typeof slug === 'string') });
    return { games: guestGameList() };
  }
  writeGuest({
    ...current,
    games: entries.filter((game) => game.enabled !== false).map((game) => game.slug),
    order: entries.map((game) => game.slug).filter((slug) => typeof slug === 'string'),
  });
  return { games: guestGameList() };
};

const isoInZone = (now, timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

const addIsoDays = (iso, days) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
};

const mondayOn = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - delta);
  return date.toISOString().slice(0, 10);
};

const playedOnOf = (preview, now, zone) => {
  if (typeof preview?.played_on === 'string' && /^\d{4}-\d{2}-\d{2}/.test(preview.played_on)) {
    return preview.played_on.slice(0, 10);
  }
  return isoInZone(now, zone);
};

const comparable = (row) => {
  const basis = row?.game?.rank_basis;
  if (basis === 'guesses') {
    if (row.solved === false) return null;
    if (row.guesses == null || Number.isNaN(Number(row.guesses))) return null;
    return Number(row.guesses);
  }
  if (row?.score == null || Number.isNaN(Number(row.score))) return null;
  return Number(row.score);
};

const personalRecord = (saved, others, zone, now) => {
  const basis = saved?.game?.rank_basis === 'guesses' ? 'guesses' : 'score';
  const direction = saved?.game?.sort_direction === 'lower' || basis === 'guesses' ? 'lower' : 'higher';
  const mine = comparable(saved);
  if (mine == null) return { best_week: false, best_all: false };
  const beats = (pool) => pool.every((row) => {
    const value = comparable(row);
    if (value == null) return true;
    return direction === 'lower' ? mine < value : mine > value;
  });
  const today = isoInZone(now, zone);
  const start = mondayOn(today);
  const end = addIsoDays(start, 6);
  const played = saved.played_on;
  const inWeek = Boolean(played) && played >= start && played <= end;
  return {
    best_all: beats(others),
    best_week: inWeek && beats(others.filter((row) => row.played_on >= start && row.played_on <= end)),
  };
};

export const fileGuestScore = (paste, preview, now = new Date()) => {
  const trimmed = typeof paste === 'string' ? paste.trim() : '';
  if (!trimmed) {
    const err = new Error('Paste a result');
    throw err;
  }
  const current = readGuest();
  const slug = preview?.game?.slug;
  const puzzle = Number(preview?.puzzle_number);
  if (current.scores.some((row) => row.game?.slug === slug && Number(row.puzzle_number) === puzzle)) {
    const err = new Error(DUPLICATE);
    throw err;
  }
  if (current.scores.length >= SCORE_LIMIT) {
    const err = new Error('Too many scores');
    throw err;
  }
  const zone = clientTimezone();
  const row = {
    local_id: `local-${now.getTime()}-${current.scores.length}`,
    paste: trimmed,
    created_at: now.toISOString(),
    played_on: playedOnOf(preview, now, zone),
    puzzle_number: preview.puzzle_number,
    score: preview.score ?? null,
    guesses: preview.guesses ?? null,
    solved: preview.solved === true,
    duration_seconds: preview.duration_seconds ?? null,
    hints: preview.hints ?? null,
    snippet: preview.snippet || '',
    game: preview.game,
    local: true,
  };
  const others = current.scores.filter((item) => item.game?.slug === slug);
  writeGuest({ ...current, scores: [row, ...current.scores] });
  return { row, personal: personalRecord(row, others, zone, now) };
};

export const deleteGuestScore = (localId) => {
  const current = readGuest();
  writeGuest({
    ...current,
    scores: current.scores.filter((row) => row.local_id !== localId),
  });
};

const asCard = (row) => ({
  score_id: row.local_id,
  local: true,
  user: { display_name: 'Guest' },
  puzzle_number: row.puzzle_number,
  snippet: row.snippet,
  score: row.score,
  guesses: row.guesses,
  solved: row.solved,
  played_on: row.played_on,
  image_url: null,
  created_at: row.created_at,
  logged_at: row.created_at,
  like_count: 0,
  liked: false,
  comment_count: 0,
  duration_seconds: row.duration_seconds,
  hints: row.hints,
  game: row.game,
});

export const guestFeedPosts = () => readGuest().scores.filter(enabledRow).map(asCard);

export const guestArchiveRows = () => readGuest().scores.filter(enabledRow).map(asCard);

const inSpan = (played, span, now) => {
  if (span !== 'week' && span !== 'month') return true;
  if (!played) return false;
  const today = isoInZone(now, clientTimezone());
  if (span === 'month') return played.slice(0, 7) === today.slice(0, 7);
  const start = mondayOn(today);
  return played >= start && played <= addIsoDays(start, 6);
};

const mean = (values) => {
  if (!values.length) return null;
  const total = values.reduce((sum, value) => sum + value, 0);
  return Math.round((total / values.length) * 10) / 10;
};

export const guestStats = (span = 'all', now = new Date()) => {
  const grouped = new Map();
  readGuest().scores.filter(enabledRow).filter((row) => inSpan(row.played_on, span, now)).forEach((row) => {
    const slug = row.game?.slug;
    if (!slug) return;
    const list = grouped.get(slug) || [];
    list.push(row);
    grouped.set(slug, list);
  });
  return [...grouped.entries()].map(([slug, rows]) => {
    const game = rows[0].game || {};
    const basis = game.rank_basis === 'guesses' ? 'guesses' : 'score';
    if (basis === 'guesses') {
      const solved = rows.filter((row) => row.solved !== false && row.guesses != null);
      const guesses = solved.map((row) => Number(row.guesses)).filter((value) => Number.isFinite(value));
      const durations = rows.map((row) => Number(row.duration_seconds)).filter((value) => Number.isFinite(value));
      const hints = rows.map((row) => Number(row.hints)).filter((value) => Number.isFinite(value));
      const stat = {
        slug,
        name: game.name || slug,
        rank_basis: 'guesses',
        played: rows.length,
        solved_count: solved.length,
        gave_up: rows.filter((row) => row.solved === false).length,
        average_guesses: mean(guesses),
        best_guesses: guesses.length ? Math.min(...guesses) : null,
        guess_cap: Object.prototype.hasOwnProperty.call(game, 'guess_cap') ? game.guess_cap : 6,
      };
      if (durations.length) stat.average_duration_seconds = mean(durations);
      if (hints.length) stat.average_hints = mean(hints);
      return stat;
    }
    const scores = rows.map((row) => Number(row.score)).filter((value) => Number.isFinite(value));
    const lower = game.sort_direction === 'lower';
    return {
      slug,
      name: game.name || slug,
      rank_basis: 'score',
      played: rows.length,
      average_score: mean(scores),
      best_score: scores.length ? (lower ? Math.min(...scores) : Math.max(...scores)) : null,
    };
  });
};

export const guestTodayPayload = (now = new Date()) => {
  const on = isoInZone(now, clientTimezone());
  const scores = readGuest().scores.filter(enabledRow).filter((row) => row.played_on === on).map((row) => ({
    slug: row.game?.slug,
    name: row.game?.name,
    rank_basis: row.game?.rank_basis,
    guess_cap: row.game?.guess_cap,
    guesses: row.guesses,
    solved: row.solved,
    score: row.score,
    snippet: row.snippet,
  }));
  return { on, scores };
};

const storyLine = (row) => {
  const mark = formatResult(row);
  const snippet = typeof row.snippet === 'string' ? row.snippet.trim() : '';
  if (snippet && mark) return `${snippet}\n${mark}`;
  return mark || snippet;
};

export const guestRecap = (period, now = new Date()) => {
  const on = isoInZone(now, clientTimezone());
  const span = period === 'week' ? 'week' : 'today';
  const start = mondayOn(on);
  const end = addIsoDays(start, 6);
  const games = readGuest().scores.filter(enabledRow).filter((row) => (
    span === 'week' ? row.played_on >= start && row.played_on <= end : row.played_on === on
  )).map((row) => ({
    slug: row.game?.slug,
    name: row.game?.name,
    rank: null,
    line: storyLine(row),
  }));
  return { period: span, on, games };
};

export const markGuestImport = (userId) => {
  try {
    sessionStorage.setItem(GUEST_IMPORT_KEY, String(userId));
  } catch {
    /* private mode */
  }
};

export const guestImportUserId = () => {
  try {
    const raw = sessionStorage.getItem(GUEST_IMPORT_KEY) || '';
    if (!raw || raw.endsWith(':tried')) return '';
    return raw;
  } catch {
    return '';
  }
};

export const markGuestImportTried = (userId) => {
  try {
    sessionStorage.setItem(GUEST_IMPORT_KEY, `${userId}:tried`);
  } catch {
    /* private mode */
  }
};

export const clearGuestImport = () => {
  try {
    sessionStorage.removeItem(GUEST_IMPORT_KEY);
  } catch {
    /* private mode */
  }
};
