const { isDbHealthy, query, withTransaction } = require('../db');
const scoreQueries = require('../queries/scoreQueries');
const { parsePaste } = require('../parsers');
const { puzzleDate } = require('../parsers/puzzleDate');
const { normalizeImageUrl } = require('../utils/imageUrl');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const PASTE_LIMIT = 8000;

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const run = (client, text, params) => {
  if (client) return client.query(text, params);
  return query(text, params);
};

const one = async (client, text, params) => {
  const result = await run(client, text, params);
  return result.rows[0] || null;
};

const assignRanks = (rows, direction) => {
  const byGroup = new Map();
  for (const row of rows) {
    const groupId = Number(row.group_id);
    const list = byGroup.get(groupId) || [];
    list.push({
      score_id: Number(row.score_id),
      value: Number(row.value),
    });
    byGroup.set(groupId, list);
  }
  const ranks = new Map();
  for (const [groupId, list] of byGroup) {
    const sorted = [...list].sort((a, b) => {
      if (a.value === b.value) return a.score_id - b.score_id;
      return direction === 'lower' ? a.value - b.value : b.value - a.value;
    });
    let rank = 0;
    let seen = 0;
    let last = null;
    for (const row of sorted) {
      seen += 1;
      if (last === null || row.value !== last) rank = seen;
      last = row.value;
      ranks.set(`${groupId}:${row.score_id}`, rank);
    }
  }
  return ranks;
};

const readPaste = (paste) => {
  if (typeof paste !== 'string' || !paste.trim()) httpError(400, 'Paste a result');
  const trimmed = paste.trim();
  if (trimmed.length > PASTE_LIMIT) httpError(400, 'Paste is too long');
  return trimmed;
};

const recognize = async (client, userId, paste, now, timezone = 'UTC') => {
  const trimmed = readPaste(paste);
  const parsed = parsePaste(trimmed, { now, timezone });
  if (!parsed) httpError(400, 'Unrecognized result');
  requireDb();
  const game = await one(client, scoreQueries.findGameBySlug, [parsed.slug]);
  if (!game) httpError(400, 'Unrecognized result');
  if (game.rank_basis === 'score') {
    const score = Number(parsed.score);
    const hundredths = Math.round(score * 100);
    const wholeHundredths = Number.isFinite(score) && Math.abs(score * 100 - hundredths) < 1e-6;
    if (!wholeHundredths || score < 0 || parsed.guesses != null || !parsed.solved) {
      httpError(400, 'Unrecognized result');
    }
  } else if (game.rank_basis === 'guesses') {
    if (parsed.score != null) httpError(400, 'Unrecognized result');
    const cap = Object.prototype.hasOwnProperty.call(game, 'guess_cap') ? game.guess_cap : 6;
    if (cap == null) {
      if (!Number.isInteger(parsed.guesses) || parsed.guesses < 1 || parsed.guesses > 9999) {
        httpError(400, 'Unrecognized result');
      }
      if (parsed.slug === 'redactle') {
        if (!Number.isInteger(parsed.duration_seconds) || parsed.duration_seconds < 0) {
          httpError(400, 'Unrecognized result');
        }
        if (!Number.isInteger(parsed.hints) || parsed.hints < 0) {
          httpError(400, 'Unrecognized result');
        }
      } else if (parsed.hints != null && (!Number.isInteger(parsed.hints) || parsed.hints < 0)) {
        httpError(400, 'Unrecognized result');
      }
    } else if (parsed.solved) {
      if (!Number.isInteger(parsed.guesses) || parsed.guesses < 1 || parsed.guesses > Number(cap)) {
        httpError(400, 'Unrecognized result');
      }
    } else if (parsed.guesses != null) {
      httpError(400, 'Unrecognized result');
    }
  } else {
    httpError(400, 'Unrecognized result');
  }
  if (!Number.isInteger(parsed.puzzle_number) || parsed.puzzle_number < 0) {
    httpError(400, 'Unrecognized result');
  }
  const destinations = await run(client, scoreQueries.listDestinations, [userId, parsed.slug]);
  return {
    trimmed,
    parsed: {
      ...parsed,
      snippet: String(parsed.snippet || '').slice(0, 2000),
    },
    game,
    destinations: destinations.rows.map((row) => ({
      group_id: row.group_id,
      name: row.name,
    })),
  };
};

const present = (recognized, groups) => ({
  game: {
    game_id: recognized.game.game_id,
    slug: recognized.game.slug,
    name: recognized.game.name,
    rank_basis: recognized.game.rank_basis,
    board: recognized.game.board,
    sort_direction: recognized.game.sort_direction,
    ...(recognized.game.guess_cap !== undefined
      ? { guess_cap: recognized.game.guess_cap == null ? null : Number(recognized.game.guess_cap) }
      : {}),
  },
  puzzle_number: recognized.parsed.puzzle_number,
  score: recognized.parsed.score,
  guesses: recognized.parsed.guesses,
  solved: recognized.parsed.solved,
  duration_seconds: recognized.parsed.duration_seconds ?? null,
  hints: recognized.parsed.hints ?? null,
  snippet: recognized.parsed.snippet,
  groups,
});

const preview = async (userId, paste, now = new Date(), timezone = 'UTC') => {
  const recognized = await recognize(null, userId, paste, now, timezone);
  return present(
    recognized,
    recognized.destinations.map((group) => ({
      group_id: group.group_id,
      name: group.name,
    }))
  );
};

const loadBoard = async (client, game, parsed, groupIds) => {
  if (!groupIds.length) return [];
  if (game.rank_basis === 'guesses') {
    const listed = await run(client, scoreQueries.listPuzzleBoard, [game.game_id, parsed.puzzle_number, groupIds]);
    return listed.rows;
  }
  const listed = await run(client, scoreQueries.listDailyBoard, [game.game_id, groupIds]);
  return listed.rows;
};

const pickGroups = (destinations, groupIds) => {
  if (!Array.isArray(groupIds)) return destinations;
  const wanted = new Set(
    groupIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
  );
  return destinations.filter((group) => wanted.has(Number(group.group_id)));
};

const confirm = async (userId, paste, now = new Date(), groupIds, timezone = 'UTC', imageUrl) => {
  const picture = normalizeImageUrl(imageUrl);
  const recognized = await recognize(null, userId, paste, now, timezone);
  const { trimmed, parsed, game } = recognized;
  const destinations = pickGroups(recognized.destinations, groupIds);
  const saved = await withTransaction(async (client) => {
    const row = await one(client, scoreQueries.upsertScore, [
      userId,
      game.game_id,
      parsed.puzzle_number,
      trimmed,
      parsed.snippet,
      parsed.score,
      parsed.guesses,
      parsed.solved,
      (/^\d{4}-\d{2}-\d{2}$/.test(parsed.played_on) ? parsed.played_on : null)
        || puzzleDate(game.slug, parsed.puzzle_number)
        || now.toISOString().slice(0, 10),
      parsed.duration_seconds ?? null,
      parsed.hints ?? null,
    ]);
    if (!row) httpError(409, "you've already uploaded this score");
    if (picture) {
      await run(client, scoreQueries.setScoreImage, [row.score_id, userId, picture]);
    }
    await run(client, scoreQueries.deletePublications, [row.score_id]);
    for (const group of destinations) {
      await run(client, scoreQueries.insertPublication, [row.score_id, group.group_id]);
    }
    const board = await loadBoard(
      client,
      game,
      parsed,
      destinations.map((group) => group.group_id)
    );
    const history = await run(client, scoreQueries.listUserGameScores, [userId, game.game_id]);
    return { row, board, history: history.rows };
  });
  const ranks = assignRanks(saved.board, game.sort_direction);
  const playedOn = (/^\d{4}-\d{2}-\d{2}$/.test(parsed.played_on) ? parsed.played_on : null)
    || puzzleDate(game.slug, parsed.puzzle_number)
    || now.toISOString().slice(0, 10);
  const posted = present(
    { ...recognized, destinations },
    destinations.map((group) => ({
      group_id: group.group_id,
      name: group.name,
      rank: ranks.get(`${Number(group.group_id)}:${Number(saved.row.score_id)}`) ?? null,
    }))
  );
  posted.score_id = Number(saved.row.score_id);
  posted.image_url = picture;
  posted.personal = personalRecord(
    { ...saved.row, played_on: playedOn, score: parsed.score, guesses: parsed.guesses, solved: parsed.solved },
    saved.history.filter((row) => Number(row.score_id) !== Number(saved.row.score_id)),
    game,
    timezone,
    now
  );
  try {
    const listed = await query(scoreQueries.listGlobalRows, [safeZone(timezone), null]);
    const standings = buildStandings(listed.rows, userId, null);
    const mine = standings.board(0, {
      slug: game.slug,
      name: game.name,
      enabled: true,
      board: game.board,
      rank_basis: game.rank_basis,
      guess_cap: game.guess_cap,
      min_entries: game.min_entries,
    });
    const entry = (mine?.daily_entries || []).find((row) => row.mine);
    posted.global_rank = entry?.rank ?? null;
  } catch (err) {
    console.error('Global rank failed:', err.message);
    posted.global_rank = null;
  }
  try {
    const pushService = require('./pushService');
    await pushService.notifyScore({
      userId,
      gameName: game.name,
      groups: destinations,
    });
  } catch (err) {
    console.error('Crown push failed:', err.message);
  }
  try {
    require('../socket').joinUnlocked(userId);
  } catch (err) {
    console.error('Parlor room join failed:', err.message);
  }
  try {
    await require('./parlorService').noteStandings({
      userId,
      game,
      groups: destinations,
    });
  } catch (err) {
    console.error('Standings note failed:', err.message);
  }
  return posted;
};

const isFlag = (value) => value === true || value === 't';

const isToday = (row) => isFlag(row.logged_today);

const inWeek = (row) => (row.logged_this_week == null ? true : isFlag(row.logged_this_week));

const betterPlayer = (current, candidate, direction) => {
  if (!current) return candidate;
  if (candidate.value === current.value) {
    return candidate.score_id > current.score_id ? candidate : current;
  }
  if (direction === 'lower') return candidate.value < current.value ? candidate : current;
  return candidate.value > current.value ? candidate : current;
};

const isoDay = (value) => {
  if (value == null || value === '') return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const laterStamp = (current, next) => {
  if (!next) return current || null;
  if (!current) return next;
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
};

const MISS_GUESSES = 7;
// Above the stored guess cap, so a Redactle give-up sorts after every solve.
const GIVE_UP_RANK = 10000;

const isSolvedGuess = (row) => {
  if (row.solved === false || row.solved === 'f') return false;
  return row.guesses != null && !Number.isNaN(Number(row.guesses));
};

const attemptGuesses = (row) => {
  if (row.guesses != null && !Number.isNaN(Number(row.guesses))) return Number(row.guesses);
  return MISS_GUESSES;
};

// A thin week is penalized so one sharp score cannot own a long board.
// 50% through 75% uses 1.25, the step between 1.5 and 1.
const consistencyMultiplier = (ratio) => {
  if (ratio > 0.75) return 1;
  if (ratio >= 0.5) return 1.25;
  if (ratio >= 0.25) return 1.5;
  return 2;
};

const daysInclusive = (from, to) => {
  if (!from || !to || to < from) return 1;
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

const mondayOn = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay();
  const delta = weekday === 0 ? 6 : weekday - 1;
  date.setUTCDate(date.getUTCDate() - delta);
  return date.toISOString().slice(0, 10);
};

const safeZone = (zone) => {
  const name = typeof zone === 'string' && zone.trim() ? zone.trim() : 'UTC';
  try {
    Intl.DateTimeFormat('en-US', { timeZone: name }).format(new Date());
    return name;
  } catch {
    return 'UTC';
  }
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

const comparableValue = (row, basis) => {
  if (basis === 'guesses') {
    if (row.solved === false || row.solved === 'f') return null;
    if (row.guesses == null || Number.isNaN(Number(row.guesses))) return null;
    return Number(row.guesses);
  }
  if (row.score == null || Number.isNaN(Number(row.score))) return null;
  return Number(row.score);
};

const personalRecord = (saved, others, game, timezone, now) => {
  const basis = game.rank_basis === 'guesses' ? 'guesses' : 'score';
  const direction = game.sort_direction === 'lower' || basis === 'guesses' ? 'lower' : 'higher';
  const mine = comparableValue(saved, basis);
  if (mine == null) return { best_week: false, best_all: false };
  const beats = (pool) => pool.every((row) => {
    const value = comparableValue(row, basis);
    if (value == null) return true;
    return direction === 'lower' ? mine < value : mine > value;
  });
  const today = isoInZone(now, timezone);
  const start = mondayOn(today);
  const end = addIsoDays(start, 6);
  const played = isoDay(saved.played_on);
  const inWeekSpan = (day) => Boolean(day) && day >= start && day <= end;
  return {
    best_all: beats(others),
    best_week: inWeekSpan(played) && beats(others.filter((row) => inWeekSpan(isoDay(row.played_on)))),
  };
};

const firstIso = (rows, field) => {
  for (const row of rows) {
    const day = isoDay(row[field]);
    if (day) return day;
  }
  return '';
};

const earliestPlayed = (rows) => {
  const days = rows.map((row) => isoDay(row.played_on)).filter(Boolean).sort();
  return days[0] || '';
};

// The attempt window starts when the game was turned on, or on the first
// filed score when that score is older. It does not start at the group charter,
// and older scores stay on the board.
const gameStart = (rows) => {
  const opened = firstIso(rows, 'game_on');
  const firstScore = earliestPlayed(rows);
  if (opened && firstScore) return opened < firstScore ? opened : firstScore;
  return opened || firstScore || firstIso(rows, 'group_on');
};

const laterDay = (left, right) => {
  if (!left) return right;
  if (!right) return left;
  return left > right ? left : right;
};

const possibleDays = (rows, kind, range) => {
  const today = firstIso(rows, 'today_on');
  const opened = gameStart(rows);
  if (kind === 'today') return 1;
  if (kind === 'week') {
    if (!today) return 7;
    const start = laterDay(mondayOn(today), opened);
    if (start > today) return 1;
    return daysInclusive(start, today);
  }
  if (kind === 'all') {
    if (opened && today) {
      if (opened > today) return 1;
      return daysInclusive(opened, today);
    }
    const days = [...new Set(rows.map((row) => isoDay(row.played_on)).filter(Boolean))].sort();
    if (days.length >= 2) return daysInclusive(days[0], days[days.length - 1]);
    return Math.max(1, days.length);
  }
  if (kind === 'custom' && range?.from) {
    const end = range.to || range.from;
    const cap = today && today < end ? today : end;
    const start = laterDay(range.from, opened);
    if (cap < start) return 1;
    return daysInclusive(start, cap);
  }
  return 1;
};

const singleCustomDay = (range) => Boolean(range?.from) && (range.to || range.from) === range.from;

const wordleSummary = (rows, possible) => {
  const span = Math.max(1, Number(possible) || 1);
  const byUser = new Map();
  for (const row of rows) {
    const key = Number(row.user_id);
    const guesses = attemptGuesses(row);
    const solved = isSolvedGuess(row);
    const current = byUser.get(key);
    if (!current) {
      byUser.set(key, {
        row,
        sum: guesses,
        count: 1,
        best: solved ? guesses : null,
        updated_at: row.updated_at,
      });
    } else {
      current.sum += guesses;
      current.count += 1;
      if (solved && (current.best == null || guesses < current.best)) current.best = guesses;
      if (laterStamp(current.updated_at, row.updated_at) === row.updated_at) {
        current.row = row;
        current.updated_at = row.updated_at;
      }
    }
  }
  return [...byUser.values()].map((item) => {
    const average = item.sum / item.count;
    const factor = consistencyMultiplier(item.count / span);
    return {
      ...item.row,
      layout: 'summary',
      score_id: item.row.user_id,
      value: average * factor,
      average,
      multiplier: Math.round(factor * 1000) / 10,
      best: item.best,
      played: item.count,
      solves: item.count,
      guesses: null,
      solved: item.best != null,
      snippet: '',
      puzzle_number: null,
      updated_at: item.updated_at,
    };
  });
};

// All-time shares sit in 25-point bands. 90% or better adds nothing, so one miss
// in a long run is not a penalty. 75% up to 90% adds 25. Each quarter below that
// adds another 25, and under 25% stops at 200%.
const shareBucket = (ratio) => {
  if (ratio >= 0.9) return 1;
  if (ratio >= 0.75) return 1.25;
  if (ratio >= 0.5) return 1.5;
  if (ratio >= 0.25) return 1.75;
  return 2;
};

// Solved share of the days in the range. Give-ups stay out of the average.
// Week uses the raw shares. All time uses the 25-point bands.
const redactleSummary = (rows, possible, buckets = false) => {
  const span = Math.max(1, Number(possible) || 1);
  const byUser = new Map();
  for (const row of rows) {
    const solved = isSolvedGuess(row);
    const guesses = solved ? Number(row.guesses) : null;
    const key = Number(row.user_id);
    const current = byUser.get(key);
    if (!current) {
      byUser.set(key, {
        row,
        sum: guesses || 0,
        solves: solved ? 1 : 0,
        gaveUp: solved ? 0 : 1,
        best: guesses,
        updated_at: row.updated_at,
      });
    } else {
      if (solved) {
        current.sum += guesses;
        current.solves += 1;
        if (current.best == null || guesses < current.best) current.best = guesses;
      } else {
        current.gaveUp += 1;
      }
      if (laterStamp(current.updated_at, row.updated_at) === row.updated_at) {
        current.row = row;
        current.updated_at = row.updated_at;
      }
    }
  }
  return [...byUser.values()].map((item) => {
    const average = item.solves ? item.sum / item.solves : null;
    const attempts = item.solves + item.gaveUp;
    const attemptRatio = Math.min(1, attempts / span);
    const solveRatio = attempts ? item.solves / attempts : 0;
    const attemptFactor = item.solves
      ? (buckets ? shareBucket(attemptRatio) : span / attempts)
      : null;
    const solveFactor = item.solves
      ? (buckets ? shareBucket(solveRatio) : attempts / item.solves)
      : null;
    const factor = attemptFactor != null && solveFactor != null ? attemptFactor * solveFactor : null;
    return {
      ...item.row,
      layout: 'summary',
      score_id: item.row.user_id,
      value: factor == null ? GIVE_UP_RANK : average * factor,
      average,
      multiplier: factor == null ? null : Math.round(factor * 1000) / 10,
      attempt_percent: attemptFactor == null ? null : Math.round(attemptFactor * 1000) / 10,
      solve_percent: solveFactor == null ? null : Math.round(solveFactor * 1000) / 10,
      solved_percent: Math.round((item.solves / span) * 1000) / 10,
      best: item.best,
      played: attempts,
      gave_up: item.gaveUp,
      solves: item.solves,
      possible: span,
      guesses: null,
      solved: item.best != null,
      snippet: '',
      puzzle_number: null,
      updated_at: item.updated_at,
    };
  });
};

const summaryForGuesses = (rows, possible) => (
  rows[0]?.slug === 'redactle' || rows[0]?.slug === 'semantle'
    ? redactleSummary(rows, possible)
    : wordleSummary(rows, possible)
);

const wordleWeekValues = (rows) => summaryForGuesses(rows, possibleDays(rows, 'week')).map((row) => ({
  user_id: Number(row.user_id),
  value: row.value,
}));

const summarizeScores = (rows, mode) => {
  const byUser = new Map();
  for (const row of rows) {
    if (row.score == null || Number.isNaN(Number(row.score))) continue;
    const key = Number(row.user_id);
    const score = Number(row.score);
    const current = byUser.get(key);
    if (!current) {
      byUser.set(key, {
        ...row,
        sum: score,
        count: 1,
        best: score,
        updated_at: row.updated_at,
      });
    } else {
      current.sum += score;
      current.count += 1;
      if (score > current.best) current.best = score;
      current.updated_at = laterStamp(current.updated_at, row.updated_at);
    }
  }
  return [...byUser.values()].map((item) => ({
    ...item,
    score_id: item.user_id,
    value: mode === 'best' ? item.best : item.sum,
    total: item.sum,
    average: item.count ? item.sum / item.count : null,
    best: item.best,
    snippet: '',
    puzzle_number: null,
  }));
};

// All time = average × multiplier.
// Points keep the share of days played. Guesses use the week board's bands, so a thin history stops at 200%.
const weightedAllTime = (rows, possible, direction, valueOf) => {
  const span = Math.max(1, Number(possible) || 1);
  const byUser = new Map();
  for (const row of rows) {
    const value = valueOf(row);
    if (value == null || Number.isNaN(Number(value))) continue;
    const numeric = Number(value);
    const key = Number(row.user_id);
    const day = isoDay(row.played_on);
    const current = byUser.get(key);
    const keepBest = direction !== 'lower'
      || isSolvedGuess(row)
      || (row.guesses == null && row.score != null && !Number.isNaN(Number(row.score)));
    if (!current) {
      const days = new Set();
      if (day) days.add(day);
      byUser.set(key, {
        row,
        sum: numeric,
        count: 1,
        days,
        best: keepBest ? numeric : null,
        updated_at: row.updated_at,
      });
    } else {
      current.sum += numeric;
      current.count += 1;
      if (day) current.days.add(day);
      if (direction === 'lower') {
        if (keepBest && (current.best == null || numeric < current.best)) current.best = numeric;
      } else if (numeric > current.best) {
        current.best = numeric;
      }
      if (laterStamp(current.updated_at, row.updated_at) === row.updated_at) {
        current.row = row;
        current.updated_at = row.updated_at;
      }
    }
  }
  return [...byUser.values()].map((item) => {
    const average = item.sum / item.count;
    const filed = item.days.size || item.count;
    const ratio = Math.min(1, filed / span);
    const factor = direction === 'lower' ? consistencyMultiplier(ratio) : ratio;
    const percent = Math.round(factor * 1000) / 10;
    return {
      ...item.row,
      layout: 'summary',
      score_id: item.row.user_id,
      value: average * (percent / 100),
      average,
      multiplier: percent,
      best: item.best,
      played: filed,
      total: item.sum,
      solves: item.count,
      guesses: null,
      solved: direction === 'lower' ? item.best != null : true,
      snippet: '',
      puzzle_number: null,
      updated_at: item.updated_at,
    };
  });
};

const bestByUser = (rows, direction, valueOf) => {
  const byUser = new Map();
  for (const row of rows) {
    const value = valueOf(row);
    if (value == null || Number.isNaN(value)) continue;
    const candidate = { ...row, value };
    const key = Number(row.user_id);
    byUser.set(key, betterPlayer(byUser.get(key), candidate, direction));
  }
  return [...byUser.values()];
};

const withRanks = (players, direction, viewerId, basis) => {
  const ranks = assignRanks(
    players.map((player) => ({
      group_id: player.group_id,
      score_id: player.score_id,
      value: player.value,
    })),
    direction
  );
  return players
    .map((player) => ({
      user_id: Number(player.user_id),
      score_id: player.score_id == null ? null : Number(player.score_id),
      handle: player.handle,
      display_name: player.display_name,
      rank: ranks.get(`${Number(player.group_id)}:${Number(player.score_id)}`) ?? null,
      score: basis === 'score' ? player.value : null,
      guesses: basis !== 'guesses' || player.layout === 'summary' || player.guesses == null
        ? null
        : Number(player.guesses),
      solved: basis !== 'guesses'
        ? true
        : player.layout === 'summary'
          ? player.best != null
          : player.solved !== false && player.solved !== 'f',
      layout: player.layout || 'score',
      played: player.played == null ? null : Number(player.played),
      solves: player.solves == null ? null : Number(player.solves),
      snippet: player.snippet || '',
      puzzle_number: player.puzzle_number == null ? null : Number(player.puzzle_number),
      portrait_url: player.portrait_url || null,
      played_on: isoDay(player.played_on) || null,
      updated_at: player.updated_at ? new Date(player.updated_at).toISOString() : null,
      total: player.total == null ? null : Number(player.total),
      average: player.average == null ? null : Number(player.average),
      best: player.best == null ? null : Number(player.best),
      multiplier: player.multiplier == null ? null : Number(player.multiplier),
      weighted: player.multiplier == null ? null : Number(player.value),
      attempt_percent: player.attempt_percent == null ? null : Number(player.attempt_percent),
      solve_percent: player.solve_percent == null ? null : Number(player.solve_percent),
      solved_percent: player.solved_percent == null ? null : Number(player.solved_percent),
      gave_up: player.gave_up == null ? null : Number(player.gave_up),
      possible: player.possible == null ? null : Number(player.possible),
      mine: Number(player.user_id) === Number(viewerId),
    }))
    .sort((a, b) => a.rank - b.rank || a.user_id - b.user_id);
};

const buildStandings = (rows, viewerId, range) => {
  const todayCounts = new Map();
  const buckets = new Map();
  for (const row of rows) {
    const groupId = Number(row.group_id);
    if (isToday(row)) todayCounts.set(groupId, (todayCounts.get(groupId) || 0) + 1);
    const key = `${groupId}:${row.slug}`;
    const list = buckets.get(key) || [];
    list.push({
      ...row,
      group_id: groupId,
      user_id: Number(row.user_id),
      score_id: Number(row.score_id),
    });
    buckets.set(key, list);
  }

  const games = new Map();
  for (const [key, list] of buckets) {
    const sample = list[0];
    const direction = sample.sort_direction === 'lower' ? 'lower' : 'higher';
    const basis = sample.rank_basis;
    const today = list.filter(isToday);
    const week = list.filter(inWeek);
    const scoreRows = (source) => source
      .filter((row) => row.score != null && !Number.isNaN(Number(row.score)))
      .map((row) => ({ ...row, value: Number(row.score) }));
    let registerDaily;
    let registerWeek;
    let registerAll;
    let summaryWeek;
    let summaryAll;
    let scoreWeek;
    let scoreAll;
    const pointValue = (row) => (row.score == null || Number.isNaN(Number(row.score)) ? null : Number(row.score));
    const filingValue = (row) => (
      (row.slug === 'redactle' || row.slug === 'semantle') && !isSolvedGuess(row) ? GIVE_UP_RANK : attemptGuesses(row)
    );
    if (basis === 'guesses') {
      registerDaily = bestByUser(today, 'lower', entryValue);
      summaryWeek = summaryForGuesses(week, possibleDays(list, 'week'));
      summaryAll = sample.slug === 'redactle' || sample.slug === 'semantle'
        ? redactleSummary(list, possibleDays(list, 'all'), true)
        : weightedAllTime(list, possibleDays(list, 'all'), 'lower', attemptGuesses);
      registerWeek = summaryWeek;
      registerAll = summaryAll;
      scoreWeek = week.map((row) => ({ ...row, value: filingValue(row) }));
      scoreAll = list.map((row) => ({ ...row, value: filingValue(row) }));
    } else {
      registerDaily = bestByUser(today, direction, pointValue);
      registerWeek = scoreRows(week);
      registerAll = scoreRows(list);
      summaryWeek = direction === 'lower'
        ? weightedAllTime(week, possibleDays(list, 'week'), direction, pointValue)
        : summarizeScores(week, 'sum');
      summaryAll = weightedAllTime(list, possibleDays(list, 'all'), direction, pointValue);
      scoreWeek = registerWeek;
      scoreAll = registerAll;
    }
    const rankDirection = basis === 'guesses' ? 'lower' : direction;
    const dailyEntries = withRanks(registerDaily, rankDirection, viewerId, basis);
    const weeklyEntries = withRanks(registerWeek, rankDirection, viewerId, basis);
    const allTimeEntries = withRanks(registerAll, rankDirection, viewerId, basis);
    const weekSummary = withRanks(summaryWeek, rankDirection, viewerId, basis);
    const allSummary = withRanks(summaryAll, rankDirection, viewerId, basis);
    const weeklyScoreEntries = withRanks(scoreWeek, rankDirection, viewerId, basis);
    const allTimeScoreEntries = withRanks(scoreAll, rankDirection, viewerId, basis);
    const mineWeek = weekSummary.find((entry) => entry.mine);
    const mineDaily = dailyEntries.find((entry) => entry.mine);
    const mineBest = allSummary.find((entry) => entry.mine);
    const end = range?.from ? (range.to || range.from) : null;
    const ranged = end
      ? list.filter((row) => {
        const on = isoDay(row.played_on);
        return on >= range.from && on <= end;
      })
      : [];
    let customPlayers = [];
    let customSummaryPlayers = [];
    if (end && basis === 'guesses' && singleCustomDay(range)) {
      customPlayers = bestByUser(ranged, 'lower', entryValue);
      customSummaryPlayers = customPlayers;
    } else if (end && basis === 'guesses') {
      customPlayers = summaryForGuesses(ranged, possibleDays(list, 'custom', range));
      customSummaryPlayers = customPlayers;
    } else if (end) {
      customPlayers = scoreRows(ranged);
      customSummaryPlayers = direction === 'lower'
        ? weightedAllTime(ranged, possibleDays(list, 'custom', range), direction, pointValue)
        : summarizeScores(ranged, 'sum');
    }
    const customEntries = end ? withRanks(customPlayers, rankDirection, viewerId, basis) : [];
    const customSummaryEntries = end ? withRanks(customSummaryPlayers, rankDirection, viewerId, basis) : [];
    const mineCustom = customSummaryEntries.find((entry) => entry.mine);
    games.set(key, {
      slug: sample.slug,
      rankBasis: basis,
      guessCap: sample.guess_cap === undefined
        ? undefined
        : (sample.guess_cap == null ? null : Number(sample.guess_cap)),
      dailyRank: mineDaily?.rank ?? null,
      dailyScore: basis === 'guesses'
        ? (mineDaily?.guesses ?? null)
        : (mineDaily?.score ?? null),
      dailySolved: basis === 'guesses' && mineDaily ? mineDaily.solved !== false : null,
      weeklyRank: mineWeek?.rank ?? null,
      weeklyScore: basis === 'guesses' ? (mineWeek?.best ?? null) : (mineWeek?.score ?? null),
      weeklyAverage: mineWeek?.average ?? null,
      weeklyBest: mineWeek?.best ?? null,
      weeklyPlayed: mineWeek?.played ?? null,
      weeklySolves: mineWeek?.solves ?? null,
      weeklyPossible: mineWeek?.possible ?? null,
      weeklyGaveUp: mineWeek?.gave_up ?? null,
      allTimeRank: mineBest?.rank ?? null,
      allTimeScore: basis === 'guesses' ? (mineBest?.best ?? null) : (mineBest?.score ?? null),
      allTimeAverage: mineBest?.average ?? null,
      allTimePlayed: mineBest?.played ?? null,
      allTimeMultiplier: mineBest?.multiplier ?? null,
      allTimeWeighted: mineBest?.weighted ?? null,
      allTimeSolves: mineBest?.solves ?? null,
      allTimePossible: mineBest?.possible ?? null,
      allTimeGaveUp: mineBest?.gave_up ?? null,
      allTimeAttempt: mineBest?.attempt_percent ?? null,
      allTimeSolve: mineBest?.solve_percent ?? null,
      submissionsToday: today.length,
      submissionsWeek: week.length,
      submissionsAll: list.length,
      customRank: mineCustom?.rank ?? null,
      customScore: basis === 'guesses'
        ? (mineCustom?.layout === 'summary' ? (mineCustom?.best ?? null) : (mineCustom?.guesses ?? null))
        : (mineCustom?.score ?? null),
      customAverage: mineCustom?.average ?? null,
      customBest: mineCustom?.best ?? null,
      customPlayed: mineCustom?.played ?? null,
      customSolves: mineCustom?.solves ?? null,
      customPossible: mineCustom?.possible ?? null,
      customGaveUp: mineCustom?.gave_up ?? null,
      customSolved: basis === 'guesses' && mineCustom ? mineCustom.solved !== false : null,
      submissionsCustom: ranged.length,
      customEntries,
      dailyEntries,
      weeklyEntries,
      allTimeEntries,
      weeklyScoreEntries,
      allTimeScoreEntries,
      weekSummary,
      allSummary,
    });
  }

  return {
    scoreCount(groupId) {
      return todayCounts.get(Number(groupId)) || 0;
    },
    standings(groupId) {
      const prefix = `${Number(groupId)}:`;
      const list = [];
      for (const [key, game] of games) {
        if (!key.startsWith(prefix)) continue;
        list.push({
          slug: game.slug,
          rank_basis: game.rankBasis,
          ...(game.guessCap !== undefined ? { guess_cap: game.guessCap } : {}),
          daily_rank: game.dailyRank,
          daily_score: game.dailyScore,
          daily_solved: game.dailySolved,
          weekly_rank: game.weeklyRank,
          weekly_score: game.weeklyScore,
          weekly_average: game.weeklyAverage,
          weekly_best: game.weeklyBest,
          weekly_played: game.weeklyPlayed,
          weekly_solves: game.weeklySolves,
          weekly_possible: game.weeklyPossible,
          weekly_gave_up: game.weeklyGaveUp,
          all_time_rank: game.allTimeRank,
          all_time_score: game.allTimeScore,
          all_time_average: game.allTimeAverage,
          all_time_played: game.allTimePlayed,
          all_time_multiplier: game.allTimeMultiplier,
          all_time_weighted: game.allTimeWeighted,
          all_time_solves: game.allTimeSolves,
          all_time_possible: game.allTimePossible,
          all_time_gave_up: game.allTimeGaveUp,
          all_time_attempt: game.allTimeAttempt,
          all_time_solve: game.allTimeSolve,
          submissions_today: game.submissionsToday,
          submissions_week: game.submissionsWeek,
          submissions_all: game.submissionsAll,
          custom_rank: game.customRank,
          custom_score: game.customScore,
          custom_average: game.customAverage,
          custom_best: game.customBest,
          custom_played: game.customPlayed,
          custom_solves: game.customSolves,
          custom_possible: game.customPossible,
          custom_gave_up: game.customGaveUp,
          custom_solved: game.customSolved,
          submissions_custom: game.submissionsCustom,
        });
      }
      return list;
    },
    board(groupId, game) {
      if (!game) return null;
      if (!game.enabled) {
        return {
          slug: game.slug,
          name: game.name,
          enabled: false,
          board: game.board,
          rank_basis: game.rank_basis,
          ...(game.guess_cap !== undefined ? { guess_cap: game.guess_cap == null ? null : Number(game.guess_cap) } : {}),
          daily_rank: null,
          weekly_rank: null,
          all_time_rank: null,
          entries: [],
          daily_entries: [],
          weekly_entries: [],
          all_time_entries: [],
        };
      }
      const found = games.get(`${Number(groupId)}:${game.slug}`);
      const dailyEntries = found ? found.dailyEntries : [];
      const weeklyEntries = found ? found.weeklyEntries : [];
      const allTimeEntries = found ? found.allTimeEntries : [];
      return {
        slug: game.slug,
        name: game.name,
        enabled: true,
        board: game.board,
        rank_basis: game.rank_basis,
        ...(game.guess_cap !== undefined ? { guess_cap: game.guess_cap == null ? null : Number(game.guess_cap) } : {}),
        min_entries: game.min_entries == null ? null : Number(game.min_entries),
        daily_rank: found ? found.dailyRank : null,
        weekly_rank: found ? found.weeklyRank : null,
        weekly_score: found ? found.weeklyScore : null,
        all_time_rank: found ? found.allTimeRank : null,
        all_time_score: found ? found.allTimeScore : null,
        all_time_average: found ? found.allTimeAverage : null,
        all_time_multiplier: found ? found.allTimeMultiplier : null,
        all_time_weighted: found ? found.allTimeWeighted : null,
        entries: dailyEntries,
        daily_entries: dailyEntries,
        weekly_entries: weeklyEntries,
        all_time_entries: allTimeEntries,
        weekly_scores: found ? found.weeklyScoreEntries : [],
        all_time_scores: found ? found.allTimeScoreEntries : [],
        weekly_leaderboard: found ? found.weekSummary : [],
        all_time_leaderboard: found ? found.allSummary : [],
        custom_entries: found ? found.customEntries : [],
        custom_rank: found ? found.customRank : null,
        custom_score: found ? found.customScore : null,
        submissions_today: found ? found.submissionsToday : 0,
        submissions_week: found ? found.submissionsWeek : 0,
        submissions_all: found ? found.submissionsAll : 0,
        submissions_custom: found ? found.submissionsCustom : 0,
      };
    },
  };
};

const entryValue = (row) => {
  if (row.rank_basis === 'guesses') {
    if ((row.slug === 'redactle' || row.slug === 'semantle') && !isSolvedGuess(row)) return GIVE_UP_RANK;
    if (row.guesses != null && !Number.isNaN(Number(row.guesses))) return Number(row.guesses);
    if (row.solved === false || row.solved === 'f') return MISS_GUESSES;
    return null;
  }
  if (row.score == null) return null;
  return Number(row.score);
};

const buildDayEntries = (rows, viewerId, slug) => {
  const list = rows.filter((row) => !slug || row.slug === slug);
  if (!list.length) return [];
  const sample = list[0];
  const basis = sample.rank_basis === 'guesses' ? 'guesses' : 'score';
  const direction = basis === 'guesses' || sample.sort_direction === 'lower' ? 'lower' : 'higher';
  const players = bestByUser(list, direction, entryValue);
  return withRanks(players, direction, viewerId, basis);
};

const buildGazette = (rows, viewerId) => {
  const today = rows.filter((row) => row.logged_today == null || isFlag(row.logged_today));
  const visible = today.filter(
    (row) => isFlag(row.enabled) || Number(row.user_id) === Number(viewerId)
  );
  const rankOf = new Map();
  const bySlug = new Map();
  for (const row of visible) {
    if (!isFlag(row.enabled)) continue;
    if (entryValue(row) == null) continue;
    const list = bySlug.get(row.slug) || [];
    list.push(row);
    bySlug.set(row.slug, list);
  }
  for (const [slug, list] of bySlug) {
    const direction = list[0].sort_direction === 'lower' ? 'lower' : 'higher';
    const ranks = assignRanks(
      list.map((row) => ({
        group_id: row.group_id,
        score_id: row.score_id,
        value: entryValue(row),
      })),
      direction
    );
    for (const [key, rank] of ranks) rankOf.set(`${slug}:${key}`, rank);
  }

  const cards = new Map();
  for (const row of visible) {
    const id = Number(row.score_id);
    let card = cards.get(id);
    if (!card) {
      card = {
        score_id: id,
        user_id: Number(row.user_id),
        handle: row.handle,
        display_name: row.display_name,
        slug: row.slug,
        name: row.game_name || row.name,
        rank_basis: row.rank_basis,
        ...(row.guess_cap !== undefined
          ? { guess_cap: row.guess_cap == null ? null : Number(row.guess_cap) }
          : {}),
        puzzle_number: row.puzzle_number == null ? null : Number(row.puzzle_number),
        score: row.score == null ? null : Number(row.score),
        guesses: row.guesses == null ? null : Number(row.guesses),
        solved: row.solved !== false && row.solved !== 'f',
        snippet: row.snippet || '',
        updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
        mine: Number(row.user_id) === Number(viewerId),
        groups: [],
      };
      cards.set(id, card);
    }
    const groupId = Number(row.group_id);
    if (card.groups.some((group) => group.group_id === groupId)) continue;
    const enabled = isFlag(row.enabled);
    card.groups.push({
      group_id: groupId,
      name: row.group_name,
      rank: enabled ? (rankOf.get(`${row.slug}:${groupId}:${row.score_id}`) ?? null) : null,
    });
  }

  return [...cards.values()]
    .map((card) => ({
      ...card,
      groups: [...card.groups].sort((a, b) => a.name.localeCompare(b.name) || a.group_id - b.group_id),
    }))
    .sort((a, b) => {
      const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
      const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
      if (at !== bt) return bt - at;
      return b.score_id - a.score_id;
    });
};

const gazette = async (userId) => {
  requireDb();
  const listed = await query(scoreQueries.listGazette, [userId]);
  return { cards: buildGazette(listed.rows, userId) };
};

const loggedToday = async (userId) => {
  requireDb();
  const row = await one(null, scoreQueries.countLoggedToday, [userId]);
  return { count: Number(row?.count) || 0 };
};

const localIso = (timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
};

const todayScores = async (userId, timezone = 'UTC') => {
  requireDb();
  const listed = await query(scoreQueries.listLoggedTodayScores, [userId]);
  return {
    on: listed.rows[0]?.filed_on || localIso(timezone),
    scores: listed.rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      rank_basis: row.rank_basis,
      ...(row.guess_cap !== undefined
        ? { guess_cap: row.guess_cap == null ? null : Number(row.guess_cap) }
        : {}),
      score: row.score == null ? null : Number(row.score),
      guesses: row.guesses == null ? null : Number(row.guesses),
      solved: row.solved !== false && row.solved !== 'f',
      snippet: row.snippet || '',
    })),
  };
};

const standingsForGroups = async (viewerId, groupIds, range) => {
  if (!groupIds.length) return buildStandings([], viewerId, range);
  const listed = await query(scoreQueries.listWeekRows, [groupIds]);
  return buildStandings(listed.rows, viewerId, range);
};

const archive = async (userId) => {
  requireDb();
  const [listed, published, shareable] = await Promise.all([
    query(scoreQueries.listArchive, [userId]),
    query(scoreQueries.listArchivePublications, [userId]),
    query(scoreQueries.listShareableGroups, [userId]),
  ]);
  const sharedByScore = new Map();
  for (const row of published.rows) {
    const list = sharedByScore.get(row.score_id) || [];
    list.push({ group_id: row.group_id, name: row.name });
    sharedByScore.set(row.score_id, list);
  }
  const destinationsBySlug = new Map();
  for (const row of shareable.rows) {
    const list = destinationsBySlug.get(row.slug) || [];
    list.push({ group_id: row.group_id, name: row.name });
    destinationsBySlug.set(row.slug, list);
  }
  return {
    scores: listed.rows.map((row) => {
      const shared = sharedByScore.get(row.score_id) || [];
      const destinations = destinationsBySlug.get(row.slug) || [];
      const options = [...destinations];
      for (const group of shared) {
        if (!options.some((option) => option.group_id === group.group_id)) options.push(group);
      }
      return {
        score_id: row.score_id,
        puzzle_number: row.puzzle_number,
        score: row.score == null ? null : Number(row.score),
        guesses: row.guesses == null ? null : Number(row.guesses),
        solved: row.solved === true || row.solved === 't',
        duration_seconds: row.duration_seconds == null ? null : Number(row.duration_seconds),
        hints: row.hints == null ? null : Number(row.hints),
        played_on: isoDay(row.played_on) || null,
        logged_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        game: {
          slug: row.slug,
          name: row.name,
          rank_basis: row.rank_basis,
          ...(row.guess_cap !== undefined
            ? { guess_cap: row.guess_cap == null ? null : Number(row.guess_cap) }
            : {}),
        },
        groups: shared,
        options,
      };
    }),
  };
};

const removeScore = async (userId, scoreId) => {
  requireDb();
  const removed = await one(null, scoreQueries.deleteOwnedScore, [scoreId, userId]);
  if (!removed) httpError(404, 'Score not found');
  return { ok: true };
};

const updateShares = async (userId, scoreId, groupIds) => {
  requireDb();
  const score = await one(null, scoreQueries.findOwnedScore, [scoreId, userId]);
  if (!score) httpError(404, 'Score not found');
  const [destinations, published] = await Promise.all([
    query(scoreQueries.listDestinations, [userId, score.slug]),
    query(scoreQueries.listArchivePublications, [userId]),
  ]);
  const allowed = new Set(destinations.rows.map((row) => Number(row.group_id)));
  for (const row of published.rows) {
    if (Number(row.score_id) === Number(scoreId)) allowed.add(Number(row.group_id));
  }
  const wanted = [
    ...new Set(
      (Array.isArray(groupIds) ? groupIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    ),
  ];
  if (wanted.some((id) => !allowed.has(id))) httpError(400, 'Unknown group');
  await withTransaction(async (client) => {
    await run(client, scoreQueries.deletePublications, [score.score_id]);
    for (const groupId of wanted) {
      await run(client, scoreQueries.insertPublication, [score.score_id, groupId]);
    }
  });
  return {
    score_id: score.score_id,
    groups: wanted.map((groupId) => {
      const named =
        destinations.rows.find((row) => Number(row.group_id) === groupId) ||
        published.rows.find((row) => Number(row.group_id) === groupId && Number(row.score_id) === Number(scoreId));
      return { group_id: groupId, name: named?.name || '' };
    }),
  };
};

const personalBests = async (userId) => {
  requireDb();
  const listed = await query(scoreQueries.listPersonalBests, [userId]);
  return {
    games: listed.rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      rank_basis: row.rank_basis,
      best_score: row.best_score == null ? null : Number(row.best_score),
      best_guesses: row.best_guesses == null ? null : Number(row.best_guesses),
      attained_at: row.attained_at ? new Date(row.attained_at).toISOString() : null,
    })),
  };
};

const numberLine = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '';
  const num = Number(value);
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
};

const fermiLine = (value) => {
  if (value == null || Number.isNaN(Number(value))) return '';
  const num = Math.round(Number(value) * 100) / 100;
  if (Number.isInteger(num)) return String(num);
  const text = num.toFixed(2);
  return text.endsWith('0') ? num.toFixed(1) : text;
};

const todayLine = (row) => {
  if (row.rank_basis === 'guesses') {
    const cap = row.guess_cap;
    if (row.daily_solved === false) return cap ? `X/${cap}` : 'X';
    const mark = numberLine(row.daily_score);
    if (!mark) return '';
    return cap ? `${mark}/${cap}` : mark;
  }
  if (row.slug === 'fermi') return fermiLine(row.daily_score);
  if (row.slug === 'noillirk') {
    const mark = numberLine(row.daily_score);
    return mark ? `${mark}m` : '';
  }
  return numberLine(row.daily_score);
};

const weekLine = (row) => {
  if (row.rank_basis === 'guesses') {
    const best = row.weekly_best == null ? '—' : numberLine(row.weekly_best);
    const average = numberLine(row.weekly_average) || '—';
    const played = row.weekly_played == null ? '0' : String(row.weekly_played);
    return `${best} · ${average} · ${played}`;
  }
  if (row.slug === 'fermi') return fermiLine(row.weekly_score);
  return numberLine(row.weekly_score);
};

const globalBoard = async (viewerId, timezone, userIds, range) => {
  requireDb();
  const ids = Array.isArray(userIds)
    ? userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    : null;
  const listed = await query(scoreQueries.listGlobalRows, [safeZone(timezone), ids]);
  return buildStandings(listed.rows, viewerId, range);
};

const recap = async (userId, timezone, period) => {
  requireDb();
  const zone = safeZone(timezone);
  const span = period === 'week' ? 'week' : 'today';
  const listed = await query(scoreQueries.listGlobalRows, [zone, null]);
  const standings = buildStandings(listed.rows, userId, null);
  const names = new Map();
  for (const row of listed.rows) names.set(row.slug, row.name);
  const games = [];
  for (const row of standings.standings(0)) {
    if (span === 'today') {
      if (row.daily_rank == null) continue;
      const line = todayLine(row);
      if (!line) continue;
      games.push({
        slug: row.slug,
        name: names.get(row.slug) || row.slug,
        rank: row.daily_rank,
        line,
      });
    } else if (row.weekly_rank != null || row.weekly_played != null) {
      const line = weekLine(row);
      if (!line) continue;
      games.push({
        slug: row.slug,
        name: names.get(row.slug) || row.slug,
        rank: row.weekly_rank,
        line,
      });
    }
  }
  const on = listed.rows.find((row) => row.today_on)?.today_on || isoInZone(new Date(), zone);
  let picked = games;
  try {
    const enabled = await require('./profileService').enabledSlugSet(userId);
    if (enabled) picked = games.filter((game) => enabled.has(game.slug));
  } catch (err) {
    console.error('Game filter failed:', err.message);
  }
  return { period: span, on, games: picked };
};

module.exports = {
  preview,
  confirm,
  assignRanks,
  buildStandings,
  buildDayEntries,
  buildGazette,
  gazette,
  loggedToday,
  todayScores,
  wordleWeekValues,
  standingsForGroups,
  personalBests,
  archive,
  removeScore,
  updateShares,
  globalBoard,
  recap,
};
