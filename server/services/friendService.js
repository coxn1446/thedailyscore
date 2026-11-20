const { isDbHealthy, query } = require('../db');
const friendQueries = require('../queries/friendQueries');
const userQueries = require('../queries/userQueries');
const pushService = require('./pushService');
const notificationService = require('./notificationService');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const one = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

const normalizeHandle = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@+/, '').toLowerCase();
};

const presentPerson = (row) => ({
  friendship_id: Number(row.friendship_id),
  user_id: Number(row.user_id),
  handle: row.handle,
  display_name: row.display_name,
  portrait_url: row.portrait_url || null,
});

const presentPair = (row, person) => ({
  friendship_id: Number(row.friendship_id),
  status: row.status,
  user: {
    user_id: Number(person.user_id),
    handle: person.handle,
    display_name: person.display_name,
    portrait_url: person.portrait_url || null,
  },
});

const actorOf = async (userId) => {
  const actor = await one(userQueries.findById, [userId]);
  return actor || { display_name: '', handle: '' };
};

const list = async (userId) => {
  requireDb();
  const listed = await query(friendQueries.listForUser, [userId]);
  const friends = [];
  const incoming = [];
  const outgoing = [];
  for (const row of listed.rows) {
    const person = presentPerson(row);
    if (row.status === 'accepted') friends.push(person);
    else if (row.status === 'pending' && Number(row.addressee_id) === Number(userId)) incoming.push(person);
    else if (row.status === 'pending' && Number(row.requester_id) === Number(userId)) outgoing.push(person);
  }
  return { friends, incoming, outgoing };
};

const acceptedIds = async (userId) => {
  requireDb();
  const listed = await query(friendQueries.listAcceptedIds, [userId]);
  return listed.rows.map((row) => Number(row.user_id));
};

const request = async (userId, handle) => {
  requireDb();
  const normalized = normalizeHandle(handle);
  if (!normalized) httpError(404, 'Unknown handle');
  const target = await one(userQueries.findByHandle, [normalized]);
  if (!target || target.suspended) httpError(404, 'Unknown handle');
  if (Number(target.user_id) === Number(userId)) httpError(409, 'You cannot add yourself');
  const existing = await one(friendQueries.findPair, [userId, target.user_id]);
  let row = existing;
  let becameFriends = false;
  if (!existing) {
    row = await one(friendQueries.insertRequest, [userId, target.user_id]);
  } else if (existing.status === 'accepted') {
    httpError(409, 'Already friends');
  } else if (existing.status === 'pending' && Number(existing.requester_id) === Number(userId)) {
    httpError(409, 'Request already sent');
  } else if (existing.status === 'pending') {
    row = await one(friendQueries.acceptRequest, [existing.friendship_id, userId]);
    becameFriends = true;
  } else {
    row = await one(friendQueries.rewriteRequest, [existing.friendship_id, userId, target.user_id]);
  }
  if (!row) httpError(409, 'Request already sent');
  const actor = await actorOf(userId);
  try {
    if (becameFriends) await pushService.notifyFriendAccept({ requesterId: target.user_id, actor });
    else {
      await pushService.notifyFriendRequest({ addresseeId: target.user_id, actor });
      await notificationService.record({
        userId: target.user_id,
        actorId: userId,
        kind: 'friend_request',
        friendshipId: row.friendship_id,
      });
    }
  } catch (err) {
    console.error('Friend push failed:', err.message);
  }
  return presentPair(row, target);
};

const respond = async (userId, friendshipId, status) => {
  requireDb();
  if (!Number.isInteger(friendshipId) || friendshipId <= 0) httpError(404, 'Request not found');
  const sql = status === 'accepted' ? friendQueries.acceptRequest : friendQueries.declineRequest;
  const row = await one(sql, [friendshipId, userId]);
  if (!row) httpError(403, 'Not your request');
  if (status === 'accepted') {
    const actor = await actorOf(userId);
    try {
      await pushService.notifyFriendAccept({ requesterId: row.requester_id, actor });
    } catch (err) {
      console.error('Friend push failed:', err.message);
    }
  }
  return { friendship_id: Number(row.friendship_id), status: row.status };
};

const remove = async (userId, friendshipId) => {
  requireDb();
  if (!Number.isInteger(friendshipId) || friendshipId <= 0) httpError(404, 'Request not found');
  const row = await one(friendQueries.deleteForUser, [friendshipId, userId]);
  if (!row) httpError(404, 'Request not found');
  return { ok: true };
};

const search = async (userId, raw) => {
  requireDb();
  const queryText = normalizeHandle(raw).replace(/[%_\\]/g, (char) => `\\${char}`);
  if (!queryText) return { users: [] };
  const listed = await query(friendQueries.searchHandles, [userId, queryText]);
  return {
    users: listed.rows.map((row) => {
      let relation = 'none';
      if (row.friendship_id && row.status !== 'declined') {
        if (row.status === 'accepted') relation = 'friends';
        else if (Number(row.requester_id) === Number(userId)) relation = 'outgoing';
        else relation = 'incoming';
      }
      return {
        user_id: Number(row.user_id),
        handle: row.handle,
        display_name: row.display_name,
        portrait_url: row.portrait_url || null,
        friendship_id: row.friendship_id == null ? null : Number(row.friendship_id),
        relation,
      };
    }),
  };
};

module.exports = {
  list,
  acceptedIds,
  search,
  request,
  respond,
  remove,
};
