const { query } = require('../db');
const scoreQueries = require('../queries/scoreQueries');
const pushQueries = require('../queries/pushQueries');
const deviceQueries = require('../queries/deviceQueries');
const { deliver } = require('./pushDelivery');
const { wordleWeekValues } = require('./scoreService');
const { hasActiveSocket, joinSockets } = require('../socket');

const isFlag = (value) => value === true || value === 't';

const labelOf = (row) => {
  const name = typeof row?.display_name === 'string' ? row.display_name.trim() : '';
  if (name) return name;
  const handle = typeof row?.handle === 'string' ? row.handle.trim() : '';
  return handle || 'A member';
};

const localHour = (timeZone, now) => {
  try {
    const hour = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .find((part) => part.type === 'hour')?.value;
    const num = Number(hour);
    if (!Number.isInteger(num)) return null;
    return num === 24 ? 0 : num;
  } catch {
    return null;
  }
};

const inWeek = (row) => (row.logged_this_week == null ? true : isFlag(row.logged_this_week));

const rankOfUser = (players, direction, userId) => {
  const sorted = [...players].sort((a, b) => {
    if (a.value === b.value) return a.user_id - b.user_id;
    return direction === 'lower' ? a.value - b.value : b.value - a.value;
  });
  let rank = 0;
  let seen = 0;
  let last = null;
  let found = null;
  for (const row of sorted) {
    seen += 1;
    if (last === null || row.value !== last) rank = seen;
    last = row.value;
    if (Number(row.user_id) === Number(userId)) found = rank;
  }
  return found;
};

const bestScores = (rows, direction) => {
  const byUser = new Map();
  for (const row of rows) {
    if (row.score == null || Number.isNaN(Number(row.score))) continue;
    const userId = Number(row.user_id);
    const value = Number(row.score);
    const current = byUser.get(userId);
    if (!current) {
      byUser.set(userId, { user_id: userId, value });
    } else if (direction === 'lower' ? value < current.value : value > current.value) {
      current.value = value;
    }
  }
  return [...byUser.values()];
};

const tookCrown = (rows, { groupId, userId, scoreId, slug }) => {
  const gameRows = rows.filter(
    (row) => Number(row.group_id) === Number(groupId) && row.slug === slug
  );
  const posted = gameRows.find((row) => Number(row.score_id) === Number(scoreId));
  if (!posted) return false;
  const before = gameRows.filter((row) => Number(row.score_id) !== Number(scoreId));
  if (posted.rank_basis === 'guesses') {
    const afterRank = rankOfUser(wordleWeekValues(gameRows.filter(inWeek)), 'lower', userId);
    const beforeRank = rankOfUser(wordleWeekValues(before.filter(inWeek)), 'lower', userId);
    return afterRank === 1 && beforeRank !== 1;
  }
  const direction = posted.sort_direction === 'lower' ? 'lower' : 'higher';
  const today = (list) => list.filter((row) => isFlag(row.logged_today));
  const afterRank = rankOfUser(bestScores(today(gameRows), direction), direction, userId);
  const beforeRank = rankOfUser(bestScores(today(before), direction), direction, userId);
  return afterRank === 1 && beforeRank !== 1;
};

const trace = (step, detail) => {
  console.log('[push]', step, detail);
};

const sendTo = async (userIds, message) => {
  const type = message?.data?.type || 'push';
  const ids = [...new Set(userIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0))];
  if (!ids.length) {
    trace('stop', { type, reason: 'no recipients' });
    return { sent: 0, users: 0 };
  }
  const listed = await query(pushQueries.listTokensForUsers, [ids]);
  const withToken = new Set(
    listed.rows.filter((row) => row.fcm_token).map((row) => Number(row.user_id))
  );
  const tokens = listed.rows.map((row) => row.fcm_token).filter(Boolean);
  const missing = ids.filter((id) => !withToken.has(id));
  trace('tokens', { type, recipients: ids, missing, tokenCount: tokens.length });
  if (!tokens.length) {
    trace('stop', { type, reason: 'no fcm token for recipients' });
    return { sent: 0, users: 0 };
  }
  const result = await deliver(tokens, message);
  if (result.stale?.length) {
    trace('stale tokens removed', { type, count: result.stale.length });
    await query(deviceQueries.deleteTokens, [result.stale]).catch(() => {});
  }
  trace('finished', { type, sent: result.sent || 0, users: withToken.size });
  return { sent: result.sent || 0, users: withToken.size };
};

const notifyCrown = async ({ userId, scoreId, groups }) => {
  const ids = (groups || [])
    .map((group) => Number(group.group_id))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length || !scoreId) return { sent: 0 };
  const listed = await query(scoreQueries.listWeekRows, [ids]);
  const posted = listed.rows.find((row) => Number(row.score_id) === Number(scoreId));
  if (!posted) return { sent: 0 };
  let sent = 0;
  for (const groupId of ids) {
    if (!tookCrown(listed.rows, { groupId, userId, scoreId, slug: posted.slug })) continue;
    const members = await query(pushQueries.listMemberAlerts, [groupId]);
    const recipients = members.rows.filter(
      (row) => Number(row.user_id) !== Number(userId) && isFlag(row.alert_crown)
    );
    const groupName = members.rows[0]?.group_name || groups.find((group) => Number(group.group_id) === groupId)?.name || 'Group';
    const result = await sendTo(
      recipients.map((row) => row.user_id),
      {
        title: groupName,
        body: `${labelOf(posted)} took 1st in ${posted.name}.`,
        data: {
          type: 'crown',
          group_id: String(groupId),
          game: String(posted.slug || ''),
        },
      }
    );
    sent += result.sent || 0;
  }
  return { sent };
};

const notifyNewMember = async ({ groupId, subjectUserId, actorUserId }) => {
  joinSockets(subjectUserId, groupId);
  const members = await query(pushQueries.listMemberAlerts, [groupId]);
  const subject = members.rows.find((row) => Number(row.user_id) === Number(subjectUserId));
  if (!subject) return { sent: 0 };
  const recipients = members.rows.filter((row) => {
    const id = Number(row.user_id);
    if (id === Number(subjectUserId) || id === Number(actorUserId)) return false;
    return isFlag(row.alert_new_member);
  });
  return sendTo(
    recipients.map((row) => row.user_id),
    {
      title: subject.group_name,
      body: `${labelOf(subject)} joined.`,
      data: {
        type: 'member',
        group_id: String(groupId),
      },
    }
  );
};

const notifyScore = async ({ userId, gameName, groups }) => {
  const destinations = (groups || []).filter((group) => Number(group.group_id) > 0);
  let sent = 0;
  for (const group of destinations) {
    const members = await query(pushQueries.listMemberAlerts, [group.group_id]);
    const actor = members.rows.find((row) => Number(row.user_id) === Number(userId));
    const recipients = members.rows.filter(
      (row) => Number(row.user_id) !== Number(userId) && isFlag(row.alert_scores)
    );
    const groupName = group.name || members.rows[0]?.group_name || 'Group';
    trace('score', {
      groupId: group.group_id,
      posterUserId: userId,
      recipients: recipients.map((row) => Number(row.user_id)),
    });
    const result = await sendTo(
      recipients.map((row) => row.user_id),
      {
        title: groupName,
        body: `${labelOf(actor)} posted their ${gameName} score to ${groupName}.`,
        data: {
          type: 'score',
          group_id: String(group.group_id),
        },
      }
    );
    sent += result.sent || 0;
  }
  return { sent };
};

const notifyReaction = async ({ groupId, actorUserId, actorName, authorUserId }) => {
  trace('reaction', { groupId, actorUserId, authorUserId });
  if (!authorUserId || Number(authorUserId) === Number(actorUserId)) {
    trace('stop', { type: 'reaction', reason: 'author is the actor' });
    return { sent: 0 };
  }
  if (hasActiveSocket(authorUserId)) {
    trace('stop', { type: 'reaction', reason: 'author has an open socket', authorUserId });
    return { sent: 0 };
  }
  const members = await query(pushQueries.listMemberAlerts, [groupId]);
  const author = members.rows.find((row) => Number(row.user_id) === Number(authorUserId));
  if (!author || !isFlag(author.alert_messages)) {
    trace('stop', { type: 'reaction', reason: author ? 'alert_messages off' : 'author is not a member' });
    return { sent: 0 };
  }
  const name = typeof actorName === 'string' && actorName.trim() ? actorName.trim() : 'A member';
  return sendTo(
    [authorUserId],
    {
      title: author.group_name || 'Group',
      body: `${name} reacted to your message.`,
      data: {
        type: 'reaction',
        group_id: String(groupId),
      },
    }
  );
};

const notifyParlor = async ({ groupId, authorUserId, authorName, body }) => {
  const members = await query(pushQueries.listMemberAlerts, [groupId]);
  const skipped = members.rows.filter((row) => {
    const id = Number(row.user_id);
    return id === Number(authorUserId) || !isFlag(row.alert_messages);
  }).map((row) => ({
    userId: Number(row.user_id),
    reason: Number(row.user_id) === Number(authorUserId) ? 'author' : 'alert_messages off',
  }));
  const recipients = members.rows.filter((row) => {
    if (Number(row.user_id) === Number(authorUserId)) return false;
    return isFlag(row.alert_messages);
  });
  trace('parlor', {
    groupId,
    authorUserId,
    authorName,
    recipients: recipients.map((row) => Number(row.user_id)),
    skipped,
  });
  const groupName = members.rows[0]?.group_name || 'Group';
  return sendTo(
    recipients.map((row) => row.user_id),
    {
      title: groupName,
      body: body || `${authorName} messaged ${groupName}.`,
      data: {
        type: 'parlor',
        group_id: String(groupId),
      },
    }
  );
};

const sendReminders = async (now = new Date()) => {
  const listed = await query(pushQueries.listReminderCandidates);
  const due = listed.rows.filter((row) => localHour(row.timezone, now) === 20);
  if (!due.length) return { reminded: 0 };
  const result = await sendTo(
    due.map((row) => row.user_id),
    {
      title: 'The Daily Score',
      body: "File today's score.",
      data: { type: 'reminder' },
    }
  );
  return { reminded: result.users };
};

const notifyLike = async ({ authorId, scoreId, actor }) => {
  if (!authorId || Number(authorId) === Number(actor?.user_id)) return { sent: 0 };
  return sendTo(
    [authorId],
    {
      title: 'The Daily Score',
      body: `${labelOf(actor)} liked your post.`,
      data: { type: 'like', score_id: String(scoreId) },
    }
  );
};

const notifyComment = async ({ authorId, scoreId, actor }) => {
  if (!authorId || Number(authorId) === Number(actor?.user_id)) return { sent: 0 };
  return sendTo(
    [authorId],
    {
      title: 'The Daily Score',
      body: `${labelOf(actor)} left a comment on your post.`,
      data: { type: 'comment', score_id: String(scoreId) },
    }
  );
};

const notifyFriendRequest = async ({ addresseeId, actor }) => sendTo(
  [addresseeId],
  {
    title: 'The Daily Score',
    body: `${labelOf(actor)} sent a friend request.`,
    data: { type: 'friend' },
  }
);

const notifyFriendAccept = async ({ requesterId, actor }) => sendTo(
  [requesterId],
  {
    title: 'The Daily Score',
    body: `${labelOf(actor)} accepted your friend request.`,
    data: { type: 'friend' },
  }
);

module.exports = {
  tookCrown,
  localHour,
  notifyCrown,
  notifyScore,
  notifyNewMember,
  notifyReaction,
  notifyParlor,
  notifyLike,
  notifyComment,
  notifyFriendRequest,
  notifyFriendAccept,
  sendReminders,
};
