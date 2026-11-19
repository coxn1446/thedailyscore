const { isDbHealthy, query } = require('../db');
const deviceQueries = require('../queries/deviceQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const PLATFORMS = new Set(['ios', 'android', 'web']);

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const readToken = (value, message) => {
  const token = typeof value === 'string' ? value.trim() : '';
  if (!token || token.length > 4096) httpError(400, message);
  return token;
};

const register = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const token = readToken(body.token, 'Token is required');
  const fcmToken = readToken(body.fcm_token, 'FCM token is required');
  const platform = typeof body.platform === 'string' ? body.platform.trim().toLowerCase() : '';
  if (!PLATFORMS.has(platform)) httpError(400, 'Platform is required');
  await query(deviceQueries.clearFcmToken, [fcmToken, token]);
  const saved = await query(deviceQueries.upsertToken, [userId, token, fcmToken, platform]);
  return {
    token: saved.rows[0].token,
    fcm_token: saved.rows[0].fcm_token,
    platform: saved.rows[0].platform,
  };
};

const remove = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const token = readToken(body.token, 'Token is required');
  const removed = await query(deviceQueries.deleteToken, [userId, token]);
  return { removed: Boolean(removed.rows[0]) };
};

module.exports = { register, remove };
