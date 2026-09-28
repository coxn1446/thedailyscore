const { isDbHealthy, query, withTransaction } = require('../db');
const scoreQueries = require('../queries/scoreQueries');
const { parsePaste } = require('../parsers');
const { puzzleDate } = require('../parsers/puzzleDate');

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
    if (!Number.isInteger(parsed.score) || parsed.score < 0 || parsed.guesses != null || !parsed.solved) {
      httpError(400, 'Unrecognized result');
    }
  } else if (game.rank_basis === 'guesses') {
    if (parsed.score != null) httpError(400, 'Unrecognized result');
    if (parsed.solved) {
      if (!Number.isInteger(parsed.guesses) || parsed.guesses < 1 || parsed.guesses > 6) {
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
  },
  puzzle_number: recognized.parsed.puzzle_number,
  score: recognized.parsed.score,
  guesses: recognized.parsed.guesses,
  solved: recognized.parsed.solved,
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

const confirm = async (userId, paste, now = new Date(), groupIds, timezone = 'UTC') => {
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
    ]);
    if (!row) httpError(409, "you've already uploaded this score");
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
    return { row, board };
  });
  const ranks = assignRanks(saved.board, game.sort_direction);
  const posted = present(
    { ...recognized, destinations },
    destinations.map((group) => ({
      group_id: group.group_id,
      name: group.name,
      rank: ranks.get(`${Number(group.group_id)}:${Number(saved.row.score_id)}`) ?? null,
    }))
  );
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

const summarizeGuesses = (rows, mode) => {
  const byUser = new Map();
  for (const row of rows) {
    if (!row.solved || row.guesses == null || Number.isNaN(Number(row.guesses))) continue;
    const key = Number(row.user_id);
    const guesses = Number(row.guesses);
    const current = byUser.get(key);
    if (!current) {
      byUser.set(key, {
        ...row,
        sum: guesses,
        count: 1,
        best: guesses,
        updated_at: row.updated_at,
      });
    } else {
      current.sum += guesses;
      current.count += 1;
      if (guesses < current.best) current.best = guesses;
      current.updated_at = laterStamp(current.updated_at, row.updated_at);
    }
  }
  return [...byUser.values()].map((item) => ({
    ...item,
    score_id: item.user_id,
    value: mode === 'best' ? item.best : item.sum / item.count,
    average: item.count ? item.sum / item.count : null,
    best: item.best,
    solves: item.count,
    snippet: '',
    puzzle_number: null,
  }));
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
      guesses: basis === 'guesses' ? player.value : null,
      solves: player.solves == null ? null : Number(player.solves),
      snippet: player.snippet || '',
      puzzle_number: player.puzzle_number == null ? null : Number(player.puzzle_number),
      portrait_url: player.portrait_url || null,
      played_on: isoDay(player.played_on) || null,
      updated_at: player.updated_at ? new Date(player.updated_at).toISOString() : null,
      total: player.total == null ? null : Number(player.total),
      average: player.average == null ? null : Number(player.average),
      best: player.best == null ? null : Number(player.best),
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
    const guessRows = (source) => source
      .filter((row) => row.solved && row.guesses != null && !Number.isNaN(Number(row.guesses)))
      .map((row) => ({ ...row, value: Number(row.guesses) }));
    let registerDaily;
    let registerWeek;
    let registerAll;
    let summaryWeek;
    let summaryAll;
    if (basis === 'guesses') {
      const guessValue = (row) => (row.guesses == null ? null : Number(row.guesses));
      registerDaily = bestByUser(
        today.filter((row) => row.solved && row.guesses != null),
        'lower',
        guessValue
      );
      registerWeek = guessRows(week);
      registerAll = guessRows(list);
      const byUser = new Map();
      for (const row of week) {
        if (!row.solved || row.guesses == null) continue;
        const key = Number(row.user_id);
        const guesses = Number(row.guesses);
        const current = byUser.get(key);
        if (!current) {
          byUser.set(key, { sum: guesses, count: 1, best: guesses, row, updated_at: row.updated_at });
        } else {
          current.sum += guesses;
          current.count += 1;
          if (guesses < current.best) current.best = guesses;
          current.updated_at = laterStamp(current.updated_at, row.updated_at);
        }
      }
      const minimum = Number(sample.min_entries) > 0 ? Number(sample.min_entries) : 1;
      summaryWeek = [...byUser.values()]
        .filter((item) => item.count >= minimum)
        .map((item) => ({
          ...item.row,
          score_id: item.row.user_id,
          value: item.sum / item.count,
          average: item.sum / item.count,
          best: item.best,
          solves: item.count,
          puzzle_number: null,
          snippet: '',
          updated_at: item.updated_at,
        }));
      summaryAll = summarizeGuesses(list, 'average').filter((item) => item.solves >= minimum);
    } else {
      const valueOf = (row) => (row.score == null ? null : Number(row.score));
      registerDaily = bestByUser(today, direction, valueOf);
      registerWeek = scoreRows(week);
      registerAll = scoreRows(list);
      summaryWeek = summarizeScores(week, 'sum');
      summaryAll = summarizeScores(list, 'best');
    }
    const rankDirection = basis === 'guesses' ? 'lower' : direction;
    const dailyEntries = withRanks(registerDaily, rankDirection, viewerId, basis);
    const weeklyEntries = withRanks(registerWeek, rankDirection, viewerId, basis);
    const allTimeEntries = withRanks(registerAll, rankDirection, viewerId, basis);
    const weekSummary = withRanks(summaryWeek, rankDirection, viewerId, basis);
    const allSummary = withRanks(summaryAll, rankDirection, viewerId, basis);
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
    const customRegister = basis === 'guesses' ? guessRows(ranged) : scoreRows(ranged);
    const customSummary = !end
      ? []
      : basis === 'guesses'
        ? summarizeGuesses(ranged, 'average')
        : summarizeScores(ranged, 'sum');
    const customEntries = end ? withRanks(customRegister, rankDirection, viewerId, basis) : [];
    const customSummaryEntries = end ? withRanks(customSummary, rankDirection, viewerId, basis) : [];
    const mineCustom = customSummaryEntries.find((entry) => entry.mine);
    games.set(key, {
      slug: sample.slug,
      rankBasis: basis,
      dailyRank: mineDaily?.rank ?? null,
      dailyScore: mineDaily?.score ?? mineDaily?.guesses ?? null,
      weeklyRank: mineWeek?.rank ?? null,
      weeklyScore: basis === 'guesses' ? (mineWeek?.guesses ?? null) : (mineWeek?.score ?? null),
      weeklyAverage: mineWeek?.average ?? null,
      weeklyBest: mineWeek?.best ?? null,
      allTimeRank: mineBest?.rank ?? null,
      allTimeScore: basis === 'guesses' ? (mineBest?.guesses ?? null) : (mineBest?.score ?? null),
      allTimeAverage: mineBest?.average ?? null,
      submissionsToday: today.length,
      submissionsWeek: week.length,
      submissionsAll: list.length,
      customRank: mineCustom?.rank ?? null,
      customScore: mineCustom?.score ?? mineCustom?.guesses ?? null,
      customAverage: mineCustom?.average ?? null,
      submissionsCustom: ranged.length,
      customEntries,
      dailyEntries,
      weeklyEntries,
      allTimeEntries,
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
          daily_rank: game.dailyRank,
          daily_score: game.dailyScore,
          weekly_rank: game.weeklyRank,
          weekly_score: game.weeklyScore,
          weekly_average: game.weeklyAverage,
          weekly_best: game.weeklyBest,
          all_time_rank: game.allTimeRank,
          all_time_score: game.allTimeScore,
          all_time_average: game.allTimeAverage,
          submissions_today: game.submissionsToday,
          submissions_week: game.submissionsWeek,
          submissions_all: game.submissionsAll,
          custom_rank: game.customRank,
          custom_score: game.customScore,
          custom_average: game.customAverage,
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
        min_entries: game.min_entries == null ? null : Number(game.min_entries),
        daily_rank: found ? found.dailyRank : null,
        weekly_rank: found ? found.weeklyRank : null,
        weekly_score: found ? found.weeklyScore : null,
        all_time_rank: found ? found.allTimeRank : null,
        all_time_score: found ? found.allTimeScore : null,
        entries: dailyEntries,
        daily_entries: dailyEntries,
        weekly_entries: weeklyEntries,
        all_time_entries: allTimeEntries,
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
    if (row.solved === false || row.solved === 'f' || row.guesses == null) return null;
    return Number(row.guesses);
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
        logged_at: row.created_at ? new Date(row.created_at).toISOString() : null,
        game: { slug: row.slug, name: row.name, rank_basis: row.rank_basis },
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

module.exports = {
  preview,
  confirm,
  assignRanks,
  buildStandings,
  buildDayEntries,
  buildGazette,
  gazette,
  loggedToday,
  standingsForGroups,
  personalBests,
  archive,
  removeScore,
  updateShares,
};
