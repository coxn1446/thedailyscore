const { isDbHealthy, query } = require('../db');
const notificationQueries = require('../queries/notificationQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const KINDS = new Set(['like', 'comment', 'friend_request']);

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const loggedAt = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const record = async ({ userId, actorId, kind, scoreId = null, friendshipId = null }) => {
  requireDb();
  if (!KINDS.has(kind)) return null;
  if (!userId || Number(userId) === Number(actorId)) return null;
  const saved = await query(notificationQueries.insertNotification, [
    userId,
    actorId || null,
    kind,
    scoreId || null,
    friendshipId || null,
  ]);
  return saved.rows[0] || null;
};

const present = (row) => ({
  notification_id: Number(row.notification_id),
  kind: row.kind,
  score_id: row.score_id == null ? null : Number(row.score_id),
  friendship_id: row.friendship_id == null ? null : Number(row.friendship_id),
  friendship_status: row.friendship_status || null,
  read: Boolean(row.read_at),
  created_at: loggedAt(row.created_at),
  game: row.slug ? { slug: row.slug, name: row.game_name } : null,
  actor: row.actor_id
    ? {
      user_id: Number(row.actor_id),
      handle: row.handle || null,
      display_name: row.display_name || null,
      portrait_url: row.portrait_url || null,
    }
    : null,
});

const list = async (userId) => {
  requireDb();
  const listed = await query(notificationQueries.listNotifications, [userId]);
  return { notifications: listed.rows.map(present) };
};

const unreadCount = async (userId) => {
  requireDb();
  const row = await query(notificationQueries.countUnread, [userId]);
  return { count: Number(row.rows[0]?.count) || 0 };
};

const markRead = async (userId) => {
  requireDb();
  await query(notificationQueries.markRead, [userId]);
  return { count: 0 };
};

module.exports = {
  record,
  list,
  unreadCount,
  markRead,
};
