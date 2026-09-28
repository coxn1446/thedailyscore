const GROUP_FIELDS = `
  group_id,
  name,
  tagline,
  timezone,
  invite_token,
  archived,
  created_by,
  created_at,
  updated_at
`;

const GAME_FIELDS = `
  ga.game_id,
  ga.slug,
  ga.name,
  ga.sort_direction,
  ga.rank_basis,
  ga.board,
  ga.min_entries,
  ga.resets_at,
  ga.sort_order
`;

const listGames = `
  SELECT ${GAME_FIELDS}
  FROM games ga
  ORDER BY ga.sort_order ASC, ga.game_id ASC
`;

const insertGroup = `
  INSERT INTO groups (name, tagline, timezone, invite_token, created_by)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING ${GROUP_FIELDS}
`;

const insertCurator = `
  INSERT INTO group_members (group_id, user_id, role)
  VALUES ($1, $2, 'curator')
`;

const insertGroupGame = `
  INSERT INTO group_games (group_id, game_id, enabled)
  VALUES ($1, $2, $3)
`;

const insertFellow = `
  INSERT INTO group_members (group_id, user_id, role)
  VALUES ($1, $2, 'fellow')
  ON CONFLICT (group_id, user_id) DO NOTHING
  RETURNING group_id, user_id, role
`;

const findGroupById = `
  SELECT ${GROUP_FIELDS}
  FROM groups
  WHERE group_id = $1
`;

const findGroupForUpdate = `
  SELECT ${GROUP_FIELDS}
  FROM groups
  WHERE group_id = $1
  FOR UPDATE
`;

const findGroupByToken = `
  SELECT ${GROUP_FIELDS}
  FROM groups
  WHERE invite_token = $1
`;

const findMember = `
  SELECT group_id, user_id, role, alert_messages, alert_scores
  FROM group_members
  WHERE group_id = $1 AND user_id = $2
`;

const updateMemberAlerts = `
  UPDATE group_members
  SET alert_messages = $3, alert_scores = $4
  WHERE group_id = $1 AND user_id = $2
  RETURNING group_id, user_id, role, alert_messages, alert_scores
`;

const listMine = `
  SELECT
    g.group_id,
    g.name,
    g.tagline,
    g.timezone,
    g.archived,
    g.created_at,
    m.role,
    (
      SELECT COUNT(*)::int
      FROM group_members gm
      WHERE gm.group_id = g.group_id
    ) AS member_count,
    (
      SELECT COUNT(*)::int
      FROM parlor_messages pm
      JOIN parlors pr ON pr.parlor_id = pm.parlor_id
      WHERE pr.group_id = g.group_id
        AND pm.user_id <> $1
        AND pm.message_id > COALESCE((
          SELECT rd.last_read_message_id
          FROM parlor_reads rd
          WHERE rd.group_id = g.group_id
            AND rd.user_id = $1
            AND rd.game_id = pm.game_id
        ), 0)
    ) AS unread_count,
    (
      SELECT pm.body
      FROM parlor_messages pm
      JOIN parlors pr ON pr.parlor_id = pm.parlor_id
      WHERE pr.group_id = g.group_id
      ORDER BY pm.message_id DESC
      LIMIT 1
    ) AS last_message
  FROM groups g
  JOIN group_members m
    ON m.group_id = g.group_id
   AND m.user_id = $1
  WHERE g.archived = FALSE
  ORDER BY g.name ASC, g.group_id ASC
`;

const listEnabledGamesForGroups = `
  SELECT
    gg.group_id,
    ga.game_id,
    ga.slug,
    ga.name
  FROM group_games gg
  JOIN games ga ON ga.game_id = gg.game_id
  WHERE gg.group_id = ANY($1::int[])
    AND gg.enabled = TRUE
  ORDER BY ga.sort_order ASC, ga.game_id ASC
`;

const listGroupGames = `
  SELECT
    ${GAME_FIELDS},
    gg.enabled
  FROM group_games gg
  JOIN games ga ON ga.game_id = gg.game_id
  WHERE gg.group_id = $1
  ORDER BY ga.sort_order ASC, ga.game_id ASC
`;

const listMembers = `
  SELECT
    m.user_id,
    m.role,
    u.handle,
    u.display_name
  FROM group_members m
  JOIN users u ON u.user_id = m.user_id
  WHERE m.group_id = $1
  ORDER BY
    CASE m.role WHEN 'curator' THEN 0 ELSE 1 END,
    LOWER(u.handle) ASC
`;

const findUserByExactHandle = `
  SELECT user_id, handle, display_name
  FROM users
  WHERE handle = $1
`;

const countCurators = `
  SELECT COUNT(*)::int AS curator_count
  FROM group_members
  WHERE group_id = $1 AND role = 'curator'
`;

const deleteMember = `
  DELETE FROM group_members
  WHERE group_id = $1 AND user_id = $2
  RETURNING group_id, user_id, role
`;

const setGroupGameEnabled = `
  UPDATE group_games
  SET enabled = $3
  WHERE group_id = $1 AND game_id = $2
  RETURNING group_id, game_id, enabled
`;

const archiveGroup = `
  UPDATE groups
  SET archived = TRUE
  WHERE group_id = $1
  RETURNING ${GROUP_FIELDS}
`;

const unarchiveGroup = `
  UPDATE groups
  SET archived = FALSE
  WHERE group_id = $1
  RETURNING ${GROUP_FIELDS}
`;

const renameGroup = `
  UPDATE groups
  SET name = $2
  WHERE group_id = $1
  RETURNING ${GROUP_FIELDS}
`;

const listMembershipGroupIds = `
  SELECT group_id
  FROM group_members
  WHERE user_id = $1
`;

const listArchived = `
  SELECT
    g.group_id,
    g.name,
    m.role
  FROM groups g
  JOIN group_members m
    ON m.group_id = g.group_id
   AND m.user_id = $1
  WHERE g.archived = TRUE
    AND m.role = 'curator'
  ORDER BY g.name ASC, g.group_id ASC
`;

module.exports = {
  listGames,
  insertGroup,
  insertCurator,
  insertGroupGame,
  insertFellow,
  findGroupById,
  findGroupForUpdate,
  findGroupByToken,
  findMember,
  updateMemberAlerts,
  listMine,
  listEnabledGamesForGroups,
  listGroupGames,
  listMembers,
  findUserByExactHandle,
  countCurators,
  deleteMember,
  setGroupGameEnabled,
  archiveGroup,
  unarchiveGroup,
  renameGroup,
  listArchived,
  listMembershipGroupIds,
};
