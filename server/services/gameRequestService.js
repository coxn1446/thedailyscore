const { isDbHealthy, query } = require('../db');
const gameRequestQueries = require('../queries/gameRequestQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const NOTE_LIMIT = 2000;

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const file = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const gameName = typeof body.game_name === 'string' ? body.game_name.trim() : '';
  if (!gameName || gameName.length > 80) httpError(400, 'Game name is required');
  let note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note) note = null;
  if (note && note.length > NOTE_LIMIT) httpError(400, 'Note is too long');
  const { rows } = await query(gameRequestQueries.insertRequest, [userId, gameName, note]);
  return { request: rows[0] };
};

module.exports = {
  file,
};
