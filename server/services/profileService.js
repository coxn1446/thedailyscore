const { isDbHealthy, query, withTransaction } = require('../db');
const { userQueries } = require('../queries');
const profileQueries = require('../queries/profileQueries');
const { presentUser } = require('../utils/policyVersions');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PORTRAIT = /^\/uploads\/[A-Za-z0-9._-]+$/;
const GCS_PORTRAIT = /^https:\/\/storage\.googleapis\.com\/[A-Za-z0-9._-]+\/uploads\/[A-Za-z0-9._/-]+$/;

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

const assertSelf = (actorId, requestedId) => {
  if (requestedId == null || requestedId === '') return;
  const requested = Number(requestedId);
  if (!Number.isInteger(requested) || requested !== Number(actorId)) {
    httpError(403, 'Not your profile');
  }
};

const conflictFromUnique = (err) => {
  if (err?.code !== '23505') return null;
  const constraint = String(err.constraint || '');
  const error = new Error(
    constraint.includes('handle')
      ? 'Handle already in use'
      : constraint.includes('email')
        ? 'Email already in use'
        : 'Email or handle already in use'
  );
  error.status = 409;
  return error;
};

const normalizeHandle = (value) => {
  const handle = typeof value === 'string' ? value.trim().toLowerCase().replace(/^@/, '') : '';
  if (!HANDLE_PATTERN.test(handle)) {
    httpError(400, 'Handle must use 3 to 24 letters, numbers, or underscores');
  }
  return handle;
};

const normalizeDisplayName = (value) => {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 80) httpError(400, 'Display name is required');
  return name;
};

const normalizeEmail = (value) => {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!email || !EMAIL_PATTERN.test(email)) httpError(400, 'Email is required');
  return email;
};

const normalizePortrait = (value) => {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') httpError(400, 'Portrait must be an uploaded image');
  const url = value.trim();
  if (!url) return null;
  if (url.length > 2048 || url.includes('..') || (!LOCAL_PORTRAIT.test(url) && !GCS_PORTRAIT.test(url))) {
    httpError(400, 'Portrait must be an uploaded image');
  }
  return url;
};

const numberOrNull = (value) => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const presentStat = (row) => {
  const played = Number(row.played) || 0;
  if (row.rank_basis === 'guesses') {
    return {
      slug: row.slug,
      name: row.name,
      rank_basis: 'guesses',
      played,
      solved_count: Number(row.solved_count) || 0,
      average_guesses: numberOrNull(row.average_guesses),
      best_guesses: numberOrNull(row.best_guesses),
    };
  }
  return {
    slug: row.slug,
    name: row.name,
    rank_basis: 'score',
    played,
    average_score: numberOrNull(row.average_score),
    best_score: numberOrNull(row.best_score),
  };
};

const loadUser = async (userId) => {
  const { rows } = await query(userQueries.findById, [userId]);
  const user = presentUser(rows[0] || null);
  if (!user) httpError(404, 'Account not found');
  return user;
};

const read = async (actorId, requestedId, period = 'all') => {
  requireDb();
  assertSelf(actorId, requestedId);
  const span = period === 'week' || period === 'month' ? period : 'all';
  const user = await loadUser(actorId);
  const { rows } = await query(profileQueries.listStats, [actorId, span]);
  return { user, stats: rows.map(presentStat) };
};

const flag = (value, name) => {
  if (typeof value !== 'boolean') httpError(400, `${name} is invalid`);
  return value;
};

const updateAlerts = async (actorId, body = {}) => {
  requireDb();
  assertSelf(actorId, body.user_id);
  const next = [
    actorId,
    flag(body.remind_daily, 'Daily reminder'),
    flag(body.alert_crown, 'Crown'),
    flag(body.alert_new_member, 'New member'),
  ];
  const { rows } = await query(profileQueries.updateAlerts, next);
  const user = presentUser(rows[0] || null);
  if (!user) httpError(404, 'Account not found');
  return user;
};

const update = async (actorId, body = {}) => {
  requireDb();
  assertSelf(actorId, body.user_id);
  const next = [
    actorId,
    normalizeDisplayName(body.display_name),
    normalizeHandle(body.handle),
    normalizeEmail(body.email),
    normalizePortrait(body.portrait_url),
  ];
  try {
    const { rows } = await query(profileQueries.updateProfile, next);
    const user = presentUser(rows[0] || null);
    if (!user) httpError(404, 'Account not found');
    return user;
  } catch (err) {
    const conflict = conflictFromUnique(err);
    if (conflict) throw conflict;
    throw err;
  }
};

const csvCell = (value) => {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const loggedAt = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
};

const exportScores = async (actorId, requestedId) => {
  requireDb();
  assertSelf(actorId, requestedId);
  const { rows } = await query(profileQueries.listExport, [actorId]);
  const lines = ['game,puzzle_number,score,guesses,solved,logged_at'];
  for (const row of rows) {
    lines.push(
      [
        csvCell(row.game),
        csvCell(row.puzzle_number),
        csvCell(row.score),
        csvCell(row.guesses),
        row.solved ? 'true' : 'false',
        csvCell(loggedAt(row.created_at)),
      ].join(',')
    );
  }
  return `${lines.join('\n')}\n`;
};

const removeAccount = async (actorId, requestedId) => {
  requireDb();
  assertSelf(actorId, requestedId);
  const removed = await withTransaction(async (client) => {
    await run(client, profileQueries.deleteOwnPublications, [actorId]);
    await run(client, profileQueries.deleteOwnScores, [actorId]);
    await run(client, profileQueries.promoteReplacementCurator, [actorId]);
    await run(client, profileQueries.reassignCharteredGroups, [actorId]);
    await run(client, profileQueries.deleteCharteredGroups, [actorId]);
    await run(client, profileQueries.deleteMemberships, [actorId]);
    const result = await run(client, profileQueries.deleteUser, [actorId]);
    return result.rows[0] || null;
  });
  if (!removed) httpError(404, 'Account not found');
  return { ok: true };
};

module.exports = {
  read,
  update,
  updateAlerts,
  exportScores,
  removeAccount,
};
