const { USER_FIELDS } = require('./userQueries');

const listStats = `
  SELECT
    ga.slug,
    ga.name,
    ga.rank_basis,
    ga.sort_order,
    COUNT(*)::int AS played,
    COUNT(*) FILTER (WHERE s.solved)::int AS solved_count,
    ROUND(AVG(s.score)::numeric, 1) AS average_score,
    ROUND(AVG(s.guesses) FILTER (WHERE s.solved)::numeric, 1) AS average_guesses,
    MAX(s.score) AS best_score,
    MIN(s.guesses) FILTER (WHERE s.solved AND s.guesses IS NOT NULL) AS best_guesses
  FROM scores s
  JOIN games ga ON ga.game_id = s.game_id
  JOIN users u ON u.user_id = s.user_id
  WHERE s.user_id = $1
    AND (
      $2 = 'all'
      OR (
        $2 = 'week'
        AND s.played_on >= date_trunc('week', NOW() AT TIME ZONE u.timezone)::date
        AND s.played_on < date_trunc('week', NOW() AT TIME ZONE u.timezone)::date + 7
      )
      OR (
        $2 = 'month'
        AND s.played_on >= date_trunc('month', NOW() AT TIME ZONE u.timezone)::date
        AND s.played_on < (date_trunc('month', NOW() AT TIME ZONE u.timezone) + INTERVAL '1 month')::date
      )
    )
  GROUP BY ga.game_id, ga.slug, ga.name, ga.rank_basis, ga.sort_order
  ORDER BY ga.sort_order ASC, ga.game_id ASC
`;

const listExport = `
  SELECT
    ga.name AS game,
    s.puzzle_number,
    s.score,
    s.guesses,
    s.solved,
    s.created_at
  FROM scores s
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.user_id = $1
  ORDER BY s.created_at ASC, s.score_id ASC
`;

const updateAlerts = `
  UPDATE users
  SET
    remind_daily = $2,
    alert_crown = $3,
    alert_new_member = $4,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const updateProfile = `
  UPDATE users
  SET
    display_name = $2,
    handle = $3,
    email = $4,
    portrait_url = $5,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const deleteOwnPublications = `
  DELETE FROM score_publications
  WHERE score_id IN (SELECT score_id FROM scores WHERE user_id = $1)
`;

const deleteOwnScores = `
  DELETE FROM scores
  WHERE user_id = $1
`;

const promoteReplacementCurator = `
  UPDATE group_members m
  SET role = 'curator'
  WHERE m.user_id <> $1
    AND m.group_id IN (SELECT group_id FROM groups WHERE created_by = $1)
    AND NOT EXISTS (
      SELECT 1
      FROM group_members c
      WHERE c.group_id = m.group_id
        AND c.role = 'curator'
        AND c.user_id <> $1
    )
    AND m.user_id = (
      SELECT m2.user_id
      FROM group_members m2
      WHERE m2.group_id = m.group_id
        AND m2.user_id <> $1
      ORDER BY m2.created_at ASC, m2.user_id ASC
      LIMIT 1
    )
`;

const reassignCharteredGroups = `
  UPDATE groups g
  SET created_by = (
    SELECT m.user_id
    FROM group_members m
    WHERE m.group_id = g.group_id
      AND m.user_id <> $1
    ORDER BY m.created_at ASC, m.user_id ASC
    LIMIT 1
  )
  WHERE g.created_by = $1
    AND EXISTS (
      SELECT 1
      FROM group_members m
      WHERE m.group_id = g.group_id
        AND m.user_id <> $1
    )
`;

const deleteCharteredGroups = `
  DELETE FROM groups
  WHERE created_by = $1
`;

const deleteMemberships = `
  DELETE FROM group_members
  WHERE user_id = $1
`;

const deleteUser = `
  DELETE FROM users
  WHERE user_id = $1
  RETURNING user_id
`;

module.exports = {
  listStats,
  listExport,
  updateProfile,
  updateAlerts,
  deleteOwnPublications,
  deleteOwnScores,
  promoteReplacementCurator,
  reassignCharteredGroups,
  deleteCharteredGroups,
  deleteMemberships,
  deleteUser,
};
