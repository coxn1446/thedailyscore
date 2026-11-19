const { isDbHealthy, query } = require('../db');
const groupQueries = require('../queries/groupQueries');
const parlorQueries = require('../queries/parlorQueries');
const { emitToRoom, roomName } = require('../socket');
const pushService = require('./pushService');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const PAGE = 40;
const REACTIONS = new Set(['heart', 'up', 'down', 'haha', 'exclaim', 'question']);

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const flagOn = (value) => value === true || value === 't';

const withReactions = async (userId, messages) => {
  if (!messages.length) return messages;
  const listed = await query(parlorQueries.listReactions, [messages.map((row) => row.message_id), userId]);
  const grouped = new Map();
  for (const row of listed.rows) {
    const id = Number(row.message_id);
    const list = grouped.get(id) || [];
    list.push({ kind: row.kind, count: Number(row.count), mine: flagOn(row.mine) });
    grouped.set(id, list);
  }
  return messages.map((message) => ({
    ...message,
    reactions: grouped.get(message.message_id) || [],
  }));
};

const requirePostedGame = async (userId, slug) => {
  const normalized = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!normalized) httpError(400, 'Unknown game');
  const posted = await query(parlorQueries.postedGameToday, [userId, normalized]);
  if (!posted.rows[0]) httpError(403, 'Not posted today');
  return posted.rows[0];
};

const presentMessage = (row) => ({
  message_id: Number(row.message_id),
  group_id: Number(row.group_id),
  game_id: row.game_id == null ? null : Number(row.game_id),
  game_slug: row.slug || row.game_slug || null,
  user_id: Number(row.user_id),
  handle: row.handle,
  display_name: row.display_name,
  portrait_url: row.portrait_url || null,
  body: row.body,
  kind: row.kind === 'standings' ? 'standings' : 'chat',
  created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  reactions: row.reactions || [],
});

const requireMember = async (userId, groupId) => {
  const member = await query(groupQueries.findMember, [groupId, userId]);
  if (!member.rows[0]) httpError(403, 'Not a member');
  return member.rows[0];
};

const ensureParlor = async (groupId) => {
  const found = await query(parlorQueries.findParlorByGroup, [groupId]);
  if (found.rows[0]) return found.rows[0];
  await query(parlorQueries.insertParlor, [groupId]);
  const created = await query(parlorQueries.findParlorByGroup, [groupId]);
  if (!created.rows[0]) httpError(404, 'Group not found');
  return created.rows[0];
};

const chattersFrom = (value) => {
  let rows = value;
  if (typeof rows === 'string') {
    try {
      rows = JSON.parse(rows);
    } catch {
      rows = [];
    }
  }
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 3).map((chatter) => ({
    user_id: Number(chatter.user_id),
    display_name: chatter.display_name || '',
    handle: chatter.handle || '',
    portrait_url: chatter.portrait_url || null,
  }));
};

const listConversations = async (userId) => {
  requireDb();
  const listed = await query(parlorQueries.listConversations, [userId]);
  return {
    conversations: listed.rows.map((row) => ({
      group_id: Number(row.group_id),
      group_name: row.group_name,
      game_id: Number(row.game_id),
      slug: row.slug,
      game_name: row.game_name,
      unread_count: Number(row.unread_count) || 0,
      recent_chatters: chattersFrom(row.recent_chatters),
    })),
  };
};

const listMessages = async (userId, groupId, slug, before, limit = PAGE) => {
  requireDb();
  await requireMember(userId, groupId);
  const game = await requirePostedGame(userId, slug);
  const size = Number.isInteger(limit) && limit > 0 && limit <= 50 ? limit : PAGE;
  const listed = await query(parlorQueries.listMessages, [groupId, game.game_id, before, size + 1]);
  const page = await withReactions(
    userId,
    listed.rows.slice(0, size).reverse().map(presentMessage)
  );
  const more = listed.rows.length > size;
  return {
    messages: page,
    before: more && page.length ? page[0].message_id : null,
  };
};

const setReaction = async (user, groupId, messageId, kind) => {
  requireDb();
  await requireMember(user.user_id, groupId);
  if (!REACTIONS.has(kind)) httpError(400, 'Unknown reaction');
  const message = await query(parlorQueries.messageInGroup, [messageId, groupId]);
  if (!message.rows[0]) httpError(404, 'Message not found');
  await requirePostedGame(user.user_id, message.rows[0].slug);
  const existing = await query(parlorQueries.findReaction, [messageId, user.user_id]);
  const removed = existing.rows[0]?.kind === kind;
  if (removed) {
    await query(parlorQueries.deleteReaction, [messageId, user.user_id]);
  } else {
    await query(parlorQueries.upsertReaction, [messageId, user.user_id, kind]);
  }
  const reactions = await withReactions(user.user_id, [{ message_id: Number(messageId) }]);
  const payload = {
    message_id: Number(messageId),
    group_id: Number(groupId),
    reactions: reactions[0].reactions,
  };
  emitToRoom(roomName(groupId, message.rows[0].game_id), 'parlor:reaction', payload);
  if (!removed) {
    const actorName = (user.display_name && String(user.display_name).trim()) || user.handle || 'A member';
    try {
      await pushService.notifyReaction({
        groupId,
        actorUserId: user.user_id,
        actorName,
        authorUserId: message.rows[0].user_id,
      });
    } catch (err) {
      console.error('Reaction push failed:', err.message);
    }
  }
  return payload;
};

const markRead = async (userId, groupId, slug) => {
  requireDb();
  await requireMember(userId, groupId);
  const game = await requirePostedGame(userId, slug);
  const latest = await query(parlorQueries.latestMessageId, [groupId, game.game_id]);
  const messageId = Number(latest.rows[0]?.message_id) || 0;
  if (messageId > 0) {
    await query(parlorQueries.markRead, [userId, groupId, game.game_id, messageId]);
  }
  return { unread_count: 0 };
};

const postMessage = async (user, groupId, body, slug) => {
  requireDb();
  await requireMember(user.user_id, groupId);
  const game = await requirePostedGame(user.user_id, slug);
  const text = typeof body === 'string' ? body.trim() : '';
  if (!text) httpError(400, 'Write a message');
  if (text.length > 2000) httpError(400, 'Message is too long');
  const parlor = await ensureParlor(groupId);
  const inserted = await query(parlorQueries.insertMessage, [parlor.parlor_id, game.game_id, user.user_id, text]);
  const row = inserted.rows[0];
  if (!row) httpError(500, 'Message was not stored');
  const message = presentMessage({
    ...row,
    group_id: groupId,
    slug: game.slug,
    handle: user.handle,
    display_name: user.display_name,
    portrait_url: user.portrait_url,
  });
  emitToRoom(roomName(groupId, game.game_id), 'parlor:message', message);
  const authorName = (user.display_name && String(user.display_name).trim()) || user.handle || 'A member';
  try {
    await pushService.notifyParlor({
      groupId,
      authorUserId: user.user_id,
      authorName,
      gameId: game.game_id,
      gameName: game.name,
    });
  } catch (err) {
    console.error('Parlor push failed:', err.message);
  }
  return { message };
};

const filingValue = (row) => {
  if (row.rank_basis === 'guesses') {
    if (row.guesses != null && row.guesses !== '' && row.solved !== false && row.solved !== 'f') return Number(row.guesses);
    return 7;
  }
  return row.score == null ? null : Number(row.score);
};

const filingMark = (row) => {
  if (row.rank_basis === 'guesses') {
    const cap = row.guess_cap == null || row.guess_cap === '' ? '' : `/${row.guess_cap}`;
    if (row.solved === false || row.solved === 'f' || row.guesses == null) return `X${cap}`;
    return `${row.guesses}${cap}`;
  }
  return String(row.score);
};

const standingsBody = (rows) => {
  const direction = rows[0]?.sort_direction === 'lower' || rows[0]?.rank_basis === 'guesses' ? 'lower' : 'higher';
  const byUser = new Map();
  for (const row of rows) {
    const value = filingValue(row);
    if (value == null || Number.isNaN(value)) continue;
    const current = byUser.get(Number(row.user_id));
    const better = !current
      || (direction === 'lower' ? value < current.value : value > current.value);
    if (better) byUser.set(Number(row.user_id), { ...row, value });
  }
  const ranked = [...byUser.values()].sort((a, b) => (
    direction === 'lower' ? a.value - b.value : b.value - a.value
  ) || Number(a.user_id) - Number(b.user_id));
  const lines = ['Rankings'];
  ranked.forEach((row, index) => {
    const name = (row.display_name && String(row.display_name).trim()) || row.handle || 'Member';
    lines.push(`${index + 1}. ${name} — ${filingMark(row)}`);
  });
  return lines.join('\n').slice(0, 2000);
};

const noteStandings = async ({ userId, game, groups }) => {
  if (!game || !Array.isArray(groups) || !groups.length) return;
  for (const group of groups) {
    const filings = await query(parlorQueries.todayFilings, [group.group_id, game.game_id]);
    const rows = filings.rows;
    if (!rows.length) continue;
    const members = Number(rows[0].member_count) || 0;
    const distinct = new Set(rows.map((row) => Number(row.user_id)));
    if (!members || distinct.size !== members || !distinct.has(Number(userId))) continue;
    const existing = await query(parlorQueries.standingsToday, [group.group_id, game.game_id]);
    if (existing.rows[0]) continue;
    const parlor = await ensureParlor(group.group_id);
    const author = rows.find((row) => Number(row.user_id) === Number(userId)) || rows[0];
    const inserted = await query(parlorQueries.insertStandings, [
      parlor.parlor_id,
      game.game_id,
      userId,
      standingsBody(rows),
    ]);
    const row = inserted.rows[0];
    if (!row) continue;
    const message = presentMessage({
      ...row,
      group_id: group.group_id,
      slug: game.slug,
      handle: author.handle,
      display_name: author.display_name,
      portrait_url: author.portrait_url,
    });
    emitToRoom(roomName(group.group_id, game.game_id), 'parlor:message', message);
    const authorName = (author.display_name && String(author.display_name).trim()) || author.handle || 'A member';
    try {
      await pushService.notifyParlor({
        groupId: group.group_id,
        authorUserId: userId,
        authorName,
        body: `${game.name} rankings are in.`,
      });
    } catch (err) {
      console.error('Standings push failed:', err.message);
    }
  }
};

module.exports = {
  listConversations,
  listMessages,
  postMessage,
  markRead,
  setReaction,
  noteStandings,
};
