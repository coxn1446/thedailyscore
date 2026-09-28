const { isDbHealthy, query } = require('../db');
const deviceQueries = require('../queries/deviceQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const PLATFORMS = new Set(['ios', 'android', 'web']);

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const readToken = (value) => {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token || token.length > 4096) httpError(400, 'Token is required');
  return token;
};

const register = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const token = readToken(body.token);
  const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
  if (!PLATFORMS.has(platform)) httpError(400, 'Platform is required');
  const saved = await query(deviceQueries.upsertToken, [userId, token, platform]);
  return { token: saved.rows[0].token, platform: saved.rows[0].platform };
};

const remove = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const token = readToken(body.token);
  const removed = await query(deviceQueries.deleteToken, [userId, token]);
  return { removed: Boolean(removed.rows[0]) };
};

module.exports = { register, remove };
