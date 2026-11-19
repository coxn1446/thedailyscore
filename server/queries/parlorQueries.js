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
      SELECT COALESCE(
        json_agg(
          json_build_object(
            'user_id', chatter.user_id,
            'display_name', chatter.display_name,
            'handle', chatter.handle,
            'portrait_url', chatter.portrait_url
          )
          ORDER BY chatter.message_id DESC
        ),
        '[]'::json
      )
      FROM (
        SELECT latest.user_id, latest.display_name, latest.handle, latest.portrait_url, latest.message_id
        FROM (
          SELECT DISTINCT ON (pm.user_id)
            pm.user_id,
            u.display_name,
            u.handle,
            u.portrait_url,
            pm.message_id
          FROM parlor_messages pm
          JOIN parlors pr ON pr.parlor_id = pm.parlor_id
          JOIN users u ON u.user_id = pm.user_id
          WHERE pr.group_id = g.group_id
            AND pm.game_id = ga.game_id
          ORDER BY pm.user_id, pm.message_id DESC
        ) latest
        ORDER BY latest.message_id DESC
        LIMIT 3
      ) chatter
    ) AS recent_chatters
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
  ORDER BY unread_count DESC, g.name ASC, ga.sort_order ASC, ga.game_id ASC
`;

const listMessages = `
  SELECT
    m.message_id,
    p.group_id,
    m.game_id,
    m.user_id,
    m.body,
    m.kind,
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
  SELECT m.message_id, m.user_id, m.game_id, ga.slug
  FROM parlor_messages m
  JOIN parlors p ON p.parlor_id = m.parlor_id
  JOIN games ga ON ga.game_id = m.game_id
  WHERE m.message_id = $1 AND p.group_id = $2
`;

const puzzleToday = `
  (
    date_trunc('day', NOW() AT TIME ZONE g.timezone)
    + ga.resets_at
    - CASE
        WHEN (NOW() AT TIME ZONE g.timezone)::time < ga.resets_at THEN INTERVAL '1 day'
        ELSE INTERVAL '0'
      END
  )::date
`;

const todayFilings = `
  SELECT
    s.user_id,
    s.score_id,
    s.score,
    s.guesses,
    s.solved,
    u.display_name,
    u.handle,
    u.portrait_url,
    ga.guess_cap,
    ga.rank_basis,
    ga.sort_direction,
    ga.name AS game_name,
    ga.slug,
    (SELECT COUNT(*)::int FROM group_members WHERE group_id = g.group_id) AS member_count
  FROM groups g
  JOIN games ga ON ga.game_id = $2
  JOIN score_publications p ON p.group_id = g.group_id
  JOIN scores s ON s.score_id = p.score_id AND s.game_id = ga.game_id
  JOIN users u ON u.user_id = s.user_id
  WHERE g.group_id = $1
    AND g.archived = FALSE
    AND s.played_on = ${puzzleToday}
`;

const standingsToday = `
  SELECT m.message_id
  FROM parlor_messages m
  JOIN parlors p ON p.parlor_id = m.parlor_id
  JOIN groups g ON g.group_id = p.group_id
  JOIN games ga ON ga.game_id = m.game_id
  WHERE p.group_id = $1
    AND m.game_id = $2
    AND m.kind = 'standings'
    AND (m.created_at AT TIME ZONE g.timezone)::date = ${puzzleToday}
  LIMIT 1
`;

const insertMessage = `
  INSERT INTO parlor_messages (parlor_id, game_id, user_id, body)
  VALUES ($1, $2, $3, $4)
  RETURNING message_id, game_id, user_id, body, kind, created_at
`;

const insertStandings = `
  INSERT INTO parlor_messages (parlor_id, game_id, user_id, body, kind)
  VALUES ($1, $2, $3, $4, 'standings')
  RETURNING message_id, game_id, user_id, body, kind, created_at
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
  todayFilings,
  standingsToday,
  insertStandings,
  latestMessageId,
  markRead,
  listReactions,
  findReaction,
  upsertReaction,
  deleteReaction,
  messageInGroup,
};
