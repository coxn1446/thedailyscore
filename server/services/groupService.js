const crypto = require('crypto');
const { isDbHealthy, query, withTransaction } = require('../db');
const groupQueries = require('../queries/groupQueries');
const scoreQueries = require('../queries/scoreQueries');
const scoreService = require('./scoreService');
const parlorQueries = require('../queries/parlorQueries');
const pushService = require('./pushService');
const { leaveGroupRoom } = require('../socket');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

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

const one = async (client, text, params) => {
  const result = await run(client, text, params);
  return result.rows[0] || null;
};

const normalizeHandle = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^@+/, '').toLowerCase();
};

const collectHandles = (value) => {
  const raw = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/[\s,]+/)
      : [];
  const seen = new Set();
  const handles = [];
  for (const item of raw) {
    const handle = normalizeHandle(item);
    if (!handle || seen.has(handle)) continue;
    seen.add(handle);
    handles.push(handle);
  }
  return handles;
};

const collectSlugs = (value) => {
  if (value === undefined) return new Set();
  if (!Array.isArray(value)) httpError(400, 'Games must be a list');
  const slugs = new Set();
  for (const item of value) {
    const slug = typeof item === 'string' ? item.trim().toLowerCase() : '';
    if (slug) slugs.add(slug);
  }
  return slugs;
};

const collectChanges = (input) => {
  const list = input?.games;
  if (!Array.isArray(list) || list.length === 0) httpError(400, 'Games must be a list');
  return list.map((item) => {
    const slug = typeof item?.slug === 'string' ? item.slug.trim().toLowerCase() : '';
    if (!slug) httpError(400, 'Unknown game');
    if (typeof item.enabled !== 'boolean') httpError(400, 'Enabled is required');
    return { slug, enabled: item.enabled };
  });
};

const cleanName = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/\s+/g, ' ');
};

const cleanTagline = (value) => {
  if (typeof value !== 'string') return null;
  const tagline = value.trim().replace(/\s+/g, ' ');
  if (!tagline) return null;
  if (tagline.length > 160) httpError(400, 'Tagline is too long');
  return tagline;
};

const presentGroup = (group, member, members) => {
  const payload = {
    group_id: group.group_id,
    name: group.name,
    tagline: group.tagline,
    timezone: group.timezone,
    archived: Boolean(group.archived),
    role: member.role,
    alert_messages: member.alert_messages !== false && member.alert_messages !== 'f',
    alert_scores: member.alert_scores !== false && member.alert_scores !== 'f',
    member_count: members.length,
    score_count_today: 0,
    created_at: group.created_at,
  };
  if (member.role === 'curator') payload.invite_token = group.invite_token;
  return payload;
};

const presentGames = (rows) =>
  rows.map((row) => ({
    game_id: row.game_id,
    slug: row.slug,
    name: row.name,
    sort_direction: row.sort_direction,
    rank_basis: row.rank_basis,
    board: row.board,
    min_entries: row.min_entries == null ? null : Number(row.min_entries),
    resets_at: row.resets_at,
    sort_order: row.sort_order,
    enabled: Boolean(row.enabled),
  }));

const readGroup = async (client, userId, groupId) => {
  const group = await one(client, groupQueries.findGroupById, [groupId]);
  if (!group) httpError(404, 'Group not found');
  const member = await one(client, groupQueries.findMember, [groupId, userId]);
  if (!member) httpError(403, 'Not a member');
  const gamesResult = await run(client, groupQueries.listGroupGames, [groupId]);
  const membersResult = await run(client, groupQueries.listMembers, [groupId]);
  return {
    group: presentGroup(group, member, membersResult.rows),
    games: presentGames(gamesResult.rows),
    members: membersResult.rows,
  };
};

const lockGroup = async (client, userId, groupId) => {
  const group = await one(client, groupQueries.findGroupForUpdate, [groupId]);
  if (!group) httpError(404, 'Group not found');
  const member = await one(client, groupQueries.findMember, [groupId, userId]);
  if (!member) httpError(403, 'Not a member');
  return { group, member };
};

const requireCurator = (member, message) => {
  if (member.role !== 'curator') httpError(403, message);
};

const safeNotify = async (work) => {
  try {
    await work();
  } catch (err) {
    console.error(err?.message || err);
  }
};

const addFellow = async (client, groupId, handle) => {
  if (!HANDLE_PATTERN.test(handle)) httpError(404, 'Unknown handle');
  const found = await one(client, groupQueries.findUserByExactHandle, [handle]);
  if (!found) httpError(404, 'Unknown handle');
  const existing = await one(client, groupQueries.findMember, [groupId, found.user_id]);
  if (existing) httpError(409, 'Already a member');
  const inserted = await run(client, groupQueries.insertFellow, [groupId, found.user_id]);
  if (!inserted.rows[0]) httpError(409, 'Already a member');
  return found;
};

const listMine = async (userId, range) => {
  requireDb();
  const listed = await query(groupQueries.listMine, [userId]);
  const catalog = await query(groupQueries.listGames);
  const ids = listed.rows.map((row) => row.group_id);
  let chips = [];
  let standings = null;
  if (ids.length) {
    const enabled = await query(groupQueries.listEnabledGamesForGroups, [ids]);
    chips = enabled.rows;
    standings = await scoreService.standingsForGroups(userId, ids, range);
  }
  return {
    groups: listed.rows.map((row) => ({
      group_id: row.group_id,
      name: row.name,
      tagline: row.tagline,
      timezone: row.timezone,
      archived: Boolean(row.archived),
      role: row.role,
      member_count: Number(row.member_count),
      created_at: row.created_at,
      score_count_today: standings ? standings.scoreCount(row.group_id) : 0,
      unread_count: Number(row.unread_count) || 0,
      last_message: row.last_message || null,
      standings: standings ? standings.standings(row.group_id) : [],
      enabled_games: chips
        .filter((chip) => chip.group_id === row.group_id)
        .map(({ game_id, slug, name }) => ({ game_id, slug, name })),
    })),
    games: catalog.rows,
  };
};

const getDay = async (userId, groupId, slug, offset) => {
  requireDb();
  if (!Number.isInteger(offset) || offset < 0 || offset > 366) httpError(400, 'Invalid day');
  const normalized = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  if (!normalized) httpError(400, 'Unknown game');
  const detail = await readGroup(null, userId, groupId);
  const game = detail.games.find((row) => row.slug === normalized);
  if (!game) httpError(404, 'Unknown game');
  if (!game.enabled) {
    return { slug: game.slug, enabled: false, offset, on: null, entries: [] };
  }
  const dated = await one(null, scoreQueries.boardDate, [groupId, normalized, offset]);
  const listed = await query(scoreQueries.listDayBoard, [groupId, normalized, offset]);
  return {
    slug: game.slug,
    name: game.name,
    enabled: true,
    board: game.board,
    rank_basis: game.rank_basis,
    offset,
    on: dated?.board_on || null,
    entries: scoreService.buildDayEntries(listed.rows, userId, normalized),
  };
};

const getGroup = async (userId, groupId, slug, range) => {
  requireDb();
  const detail = await readGroup(null, userId, groupId);
  const standings = await scoreService.standingsForGroups(userId, [groupId], range);
  const game = detail.games.find((row) => row.slug === slug) || null;
  return {
    ...detail,
    group: {
      ...detail.group,
      score_count_today: standings.scoreCount(groupId),
    },
    board: standings.board(groupId, game),
  };
};

const charter = async (user, input) => {
  requireDb();
  const name = cleanName(input?.name);
  if (!name) httpError(400, 'Name is required');
  if (name.length > 80) httpError(400, 'Name is too long');
  const tagline = cleanTagline(input?.tagline);
  const picked = collectSlugs(input?.games);
  const handles = collectHandles(input?.handles);
  const timezone = (typeof user.timezone === 'string' && user.timezone.trim()) || 'UTC';

  const outcome = await withTransaction(async (client) => {
    const catalog = (await run(client, groupQueries.listGames)).rows;
    if (!catalog.length) httpError(503, 'Game catalog is empty');
    const known = new Map(catalog.map((game) => [game.slug, game]));
    for (const slug of picked) {
      if (!known.has(slug)) httpError(400, 'Unknown game');
    }
    const token = crypto.randomBytes(24).toString('base64url');
    const inserted = await one(client, groupQueries.insertGroup, [
      name,
      tagline,
      timezone.slice(0, 64),
      token,
      user.user_id,
    ]);
    await run(client, groupQueries.insertCurator, [inserted.group_id, user.user_id]);
    for (const game of catalog) {
      await run(client, groupQueries.insertGroupGame, [
        inserted.group_id,
        game.game_id,
        picked.has(game.slug),
      ]);
    }
    await run(client, parlorQueries.insertParlor, [inserted.group_id]);
    const added = [];
    for (const handle of handles) {
      added.push(await addFellow(client, inserted.group_id, handle));
    }
    const detail = await readGroup(client, user.user_id, inserted.group_id);
    return { detail, added, groupId: inserted.group_id };
  });
  for (const fellow of outcome.added) {
    await safeNotify(() => pushService.notifyNewMember({
      groupId: outcome.groupId,
      subjectUserId: fellow.user_id,
      actorUserId: user.user_id,
    }));
  }
  return outcome.detail;
};

const updateGames = async (user, groupId, input) => {
  requireDb();
  const changes = collectChanges(input);
  return withTransaction(async (client) => {
    const { member } = await lockGroup(client, user.user_id, groupId);
    requireCurator(member, 'Only a curator can change games');
    const catalog = (await run(client, groupQueries.listGames)).rows;
    const known = new Map(catalog.map((game) => [game.slug, game]));
    for (const change of changes) {
      const game = known.get(change.slug);
      if (!game) httpError(400, 'Unknown game');
      const updated = await run(client, groupQueries.setGroupGameEnabled, [
        groupId,
        game.game_id,
        change.enabled,
      ]);
      if (!updated.rows[0]) httpError(404, 'Group game not found');
    }
    return readGroup(client, user.user_id, groupId);
  });
};

const archive = async (user, groupId) => {
  requireDb();
  return withTransaction(async (client) => {
    const { member } = await lockGroup(client, user.user_id, groupId);
    requireCurator(member, 'Only a curator can archive');
    await run(client, groupQueries.archiveGroup, [groupId]);
    return readGroup(client, user.user_id, groupId);
  });
};

const unarchive = async (user, groupId) => {
  requireDb();
  return withTransaction(async (client) => {
    const { member } = await lockGroup(client, user.user_id, groupId);
    requireCurator(member, 'Only a curator can unarchive');
    await run(client, groupQueries.unarchiveGroup, [groupId]);
    return readGroup(client, user.user_id, groupId);
  });
};

const rename = async (user, groupId, name) => {
  requireDb();
  const cleaned = cleanName(name);
  if (!cleaned) httpError(400, 'Name is required');
  if (cleaned.length > 80) httpError(400, 'Name is too long');
  return withTransaction(async (client) => {
    const { member } = await lockGroup(client, user.user_id, groupId);
    requireCurator(member, 'Only a curator can rename');
    await run(client, groupQueries.renameGroup, [groupId, cleaned]);
    return readGroup(client, user.user_id, groupId);
  });
};

const listArchived = async (userId) => {
  requireDb();
  const listed = await query(groupQueries.listArchived, [userId]);
  return {
    groups: listed.rows.map((row) => ({
      group_id: row.group_id,
      name: row.name,
      role: row.role,
    })),
  };
};

const updateAlerts = async (user, groupId, input = {}) => {
  requireDb();
  if (typeof input.alert_messages !== 'boolean' || typeof input.alert_scores !== 'boolean') {
    httpError(400, 'Alerts are invalid');
  }
  return withTransaction(async (client) => {
    await lockGroup(client, user.user_id, groupId);
    const updated = await run(client, groupQueries.updateMemberAlerts, [
      groupId,
      user.user_id,
      input.alert_messages,
      input.alert_scores,
    ]);
    if (!updated.rows[0]) httpError(404, 'Group not found');
    return readGroup(client, user.user_id, groupId);
  });
};

const leave = async (user, groupId) => {
  requireDb();
  await withTransaction(async (client) => {
    const { member } = await lockGroup(client, user.user_id, groupId);
    if (member.role === 'curator') {
      const count = await one(client, groupQueries.countCurators, [groupId]);
      if (Number(count?.curator_count) <= 1) httpError(403, 'The last curator cannot leave');
    }
    await run(client, groupQueries.deleteMember, [groupId, user.user_id]);
  });
  leaveGroupRoom(user.user_id, groupId);
  return { left: true };
};

const addMember = async (user, groupId, handle) => {
  requireDb();
  const normalized = normalizeHandle(handle);
  if (!normalized) httpError(400, 'Handle is required');
  const added = await withTransaction(async (client) => {
    const { group, member } = await lockGroup(client, user.user_id, groupId);
    requireCurator(member, 'Only a curator can add a member');
    if (group.archived) httpError(403, 'Archived groups are not accepting members');
    const fellow = await addFellow(client, groupId, normalized);
    const detail = await readGroup(client, user.user_id, groupId);
    return { detail, fellow };
  });
  await safeNotify(() => pushService.notifyNewMember({
    groupId,
    subjectUserId: added.fellow.user_id,
    actorUserId: user.user_id,
  }));
  return added.detail;
};

const joinByToken = async (user, token) => {
  requireDb();
  const trimmed = typeof token === 'string' ? token.trim() : '';
  if (!trimmed) httpError(404, 'Invite not found');
  const joined = await withTransaction(async (client) => {
    const group = await one(client, groupQueries.findGroupByToken, [trimmed]);
    if (!group) httpError(404, 'Invite not found');
    if (group.archived) httpError(403, 'Archived groups are not accepting members');
    const existing = await one(client, groupQueries.findMember, [group.group_id, user.user_id]);
    let created = false;
    if (!existing) {
      const inserted = await run(client, groupQueries.insertFellow, [group.group_id, user.user_id]);
      if (!inserted.rows[0]) {
        const raced = await one(client, groupQueries.findMember, [group.group_id, user.user_id]);
        if (!raced) httpError(409, 'Already a member');
      } else {
        created = true;
      }
    }
    const detail = await readGroup(client, user.user_id, group.group_id);
    return { detail, created, groupId: group.group_id };
  });
  if (joined.created) {
    await safeNotify(() => pushService.notifyNewMember({
      groupId: joined.groupId,
      subjectUserId: user.user_id,
      actorUserId: user.user_id,
    }));
  }
  return joined.detail;
};

module.exports = {
  listMine,
  getGroup,
  getDay,
  charter,
  updateGames,
  archive,
  unarchive,
  rename,
  listArchived,
  leave,
  updateAlerts,
  addMember,
  joinByToken,
};
