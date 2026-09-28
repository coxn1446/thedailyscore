const insertParlor = `
  INSERT INTO parlors (group_id)
  VALUES ($1)
  ON CONFLICT (group_id) DO NOTHING
  RETURNING parlor_id, group_id, created_at
`;

const findParlorByGroup = `
  SELECT parlor_id, group_id, created_at
  FROM parlors
  WHERE group_id = $1
`;

const membersPostedToday = `
  SELECT s.user_id
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.game_id = $1
    AND s.user_id = ANY($2::int[])
    AND s.played_on = (NOW() AT TIME ZONE u.timezone)::date
`;

const postedGameToday = `
  SELECT ga.game_id, ga.slug, ga.name
  FROM games ga
  JOIN users u ON u.user_id = $1
  WHERE ga.slug = $2
    AND EXISTS (
      SELECT 1
      FROM scores s
      WHERE s.user_id = u.user_id
        AND s.game_id = ga.game_id
        AND s.played_on = (NOW() AT TIME ZONE u.timezone)::date
    )
`;

const listUnlockedRooms = `
  SELECT g.group_id, ga.game_id
  FROM group_members m
  JOIN groups g ON g.group_id = m.group_id AND g.archived = FALSE
  JOIN group_games gg ON gg.group_id = g.group_id AND gg.enabled = TRUE
  JOIN games ga ON ga.game_id = gg.game_id
  JOIN users u ON u.user_id = m.user_id
  WHERE m.user_id = $1
    AND EXISTS (
      SELECT 1
      FROM scores s
      WHERE s.user_id = m.user_id
        AND s.game_id = ga.game_id
        AND s.played_on = (NOW() AT TIME ZONE u.timezone)::date
    )
`;

const listConversations = `
  SELECT
    g.group_id,
    g.name AS group_name,
    ga.game_id,
    ga.slug,
    ga.name AS game_name,
    (
      SELECT COUNT(*)::int
      FROM parlor_messages pm
      JOIN parlors pr ON pr.parlor_id = pm.parlor_id
      LEFT JOIN parlor_reads rd
        ON rd.group_id = g.group_id
       AND rd.game_id = ga.game_id
       AND rd.user_id = $1
      WHERE pr.group_id = g.group_id
        AND pm.game_id = ga.game_id
        AND pm.user_id <> $1
        AND pm.message_id > COALESCE(rd.last_read_message_id, 0)
    ) AS unread_count,
    (
      SELECT pm.body
      FROM parlor_messages pm
      JOIN parlors pr ON pr.parlor_id = pm.parlor_id
      WHERE pr.group_id = g.group_id
        AND pm.game_id = ga.game_id
      ORDER BY pm.message_id DESC
      LIMIT 1
    ) AS last_message
  FROM group_members m
  JOIN groups g ON g.group_id = m.group_id AND g.archived = FALSE
  JOIN group_games gg ON gg.group_id = g.group_id AND gg.enabled = TRUE
  JOIN games ga ON ga.game_id = gg.game_id
  JOIN users u ON u.user_id = m.user_id
  WHERE m.user_id = $1
    AND EXISTS (
      SELECT 1
      FROM scores s
      WHERE s.user_id = m.user_id
        AND s.game_id = ga.game_id
        AND s.played_on = (NOW() AT TIME ZONE u.timezone)::date
    )
  ORDER BY g.name ASC, ga.sort_order ASC, ga.game_id ASC
`;

const listMessages = `
  SELECT
    m.message_id,
    p.group_id,
    m.game_id,
    m.user_id,
    m.body,
    m.created_at,
    u.handle,
    u.display_name,
    u.portrait_url
  FROM parlor_messages m
  JOIN parlors p ON p.parlor_id = m.parlor_id
  JOIN users u ON u.user_id = m.user_id
  WHERE p.group_id = $1
    AND m.game_id = $2
    AND ($3::int IS NULL OR m.message_id < $3)
  ORDER BY m.message_id DESC
  LIMIT $4
`;

const latestMessageId = `
  SELECT COALESCE(MAX(m.message_id), 0)::int AS message_id
  FROM parlor_messages m
  JOIN parlors p ON p.parlor_id = m.parlor_id
  WHERE p.group_id = $1
    AND m.game_id = $2
`;

const markRead = `
  INSERT INTO parlor_reads (user_id, group_id, game_id, last_read_message_id)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (user_id, group_id, game_id) DO UPDATE
  SET last_read_message_id = GREATEST(parlor_reads.last_read_message_id, EXCLUDED.last_read_message_id),
      updated_at = NOW()
  RETURNING last_read_message_id
`;

const listReactions = `
  SELECT
    message_id,
    kind,
    COUNT(*)::int AS count,
    BOOL_OR(user_id = $2) AS mine
  FROM parlor_reactions
  WHERE message_id = ANY($1::int[])
  GROUP BY message_id, kind
  ORDER BY kind ASC
`;

const findReaction = `
  SELECT kind
  FROM parlor_reactions
  WHERE message_id = $1 AND user_id = $2
`;

const upsertReaction = `
  INSERT INTO parlor_reactions (message_id, user_id, kind)
  VALUES ($1, $2, $3)
  ON CONFLICT (message_id, user_id) DO UPDATE
  SET kind = EXCLUDED.kind
  RETURNING kind
`;

const deleteReaction = `
  DELETE FROM parlor_reactions
  WHERE message_id = $1 AND user_id = $2
`;

const messageInGroup = `
  SELECT m.message_id, m.game_id, ga.slug
  FROM parlor_messages m
  JOIN parlors p ON p.parlor_id = m.parlor_id
  JOIN games ga ON ga.game_id = m.game_id
  WHERE m.message_id = $1 AND p.group_id = $2
`;

const insertMessage = `
  INSERT INTO parlor_messages (parlor_id, game_id, user_id, body)
  VALUES ($1, $2, $3, $4)
  RETURNING message_id, game_id, user_id, body, created_at
`;

module.exports = {
  insertParlor,
  findParlorByGroup,
  postedGameToday,
  membersPostedToday,
  listUnlockedRooms,
  listConversations,
  listMessages,
  insertMessage,
  latestMessageId,
  markRead,
  listReactions,
  findReaction,
  upsertReaction,
  deleteReaction,
  messageInGroup,
};
