const { isDbHealthy, query } = require('../db');
const groupQueries = require('../queries/groupQueries');
const scoreService = require('./scoreService');
const friendService = require('./friendService');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const isoDate = (value) => (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '');

const presentGame = (row) => ({
  game_id: row.game_id,
  slug: row.slug,
  name: row.name,
  sort_direction: row.sort_direction,
  rank_basis: row.rank_basis,
  board: row.board,
  min_entries: row.min_entries == null ? null : Number(row.min_entries),
  guess_cap: row.guess_cap == null ? null : Number(row.guess_cap),
  sort_order: row.sort_order == null ? null : Number(row.sort_order),
});

const board = async (user, input = {}) => {
  requireDb();
  const scope = input.scope === 'friends' ? 'friends' : 'global';
  const slug = typeof input.game === 'string' ? input.game.trim().toLowerCase() : '';
  const from = isoDate(input.from);
  const to = isoDate(input.to) || from;
  const range = from ? { from, to } : null;
  let userIds = null;
  if (scope === 'friends') {
    const ids = await friendService.acceptedIds(user.user_id);
    userIds = [Number(user.user_id), ...ids];
  }
  const catalog = await query(groupQueries.listGames);
  const prefs = await query(require('../queries/profileQueries').listUserGames, [user.user_id]);
  const off = new Set(
    prefs.rows
      .filter((row) => row.enabled === false || row.enabled === 'f')
      .map((row) => row.slug)
  );
  const games = catalog.rows.filter((row) => !off.has(row.slug));
  const standings = await scoreService.globalBoard(user.user_id, user.timezone || 'UTC', userIds, range);
  const game = games.find((row) => row.slug === slug) || null;
  return {
    scope,
    games: games.map(presentGame),
    standings: standings.standings(0).filter((row) => !off.has(row.slug)),
    board: game
      ? standings.board(0, { ...presentGame(game), enabled: true })
      : null,
  };
};

module.exports = { board };
