const { isDbHealthy, query } = require('../db');
const gameRequestQueries = require('../queries/gameRequestQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const listRequests = async () => {
  requireDb();
  const listed = await query(gameRequestQueries.listRequests);
  return {
    requests: listed.rows.map((row) => ({
      request_id: Number(row.request_id),
      game_name: row.game_name,
      note: row.note || '',
      seen: row.seen === true || row.seen === 't',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      handle: row.handle,
      display_name: row.display_name,
    })),
  };
};

const unseenCount = async () => {
  requireDb();
  const row = await query(gameRequestQueries.countUnseen);
  return { count: Number(row.rows[0]?.count) || 0 };
};

const markSeen = async () => {
  requireDb();
  await query(gameRequestQueries.markSeen);
  return { count: 0 };
};

module.exports = { listRequests, unseenCount, markSeen };
