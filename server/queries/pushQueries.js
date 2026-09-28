const listMemberAlerts = `
  SELECT
    m.group_id,
    g.name AS group_name,
    u.user_id,
    u.handle,
    u.display_name,
    u.alert_crown,
    u.alert_new_member,
    u.remind_daily,
    m.alert_messages,
    m.alert_scores
  FROM group_members m
  JOIN users u ON u.user_id = m.user_id
  JOIN groups g ON g.group_id = m.group_id
  WHERE m.group_id = $1
    AND u.suspended = FALSE
`;

const listTokensForUsers = `
  SELECT user_id, token
  FROM device_tokens
  WHERE user_id = ANY($1::int[])
`;

// remind_daily is on, and no score was posted on the current local date.
const listReminderCandidates = `
  SELECT u.user_id, u.display_name, u.handle, u.timezone
  FROM users u
  WHERE u.remind_daily = TRUE
    AND u.suspended = FALSE
    AND u.timezone IN (SELECT name FROM pg_timezone_names)
    AND NOT EXISTS (
      SELECT 1
      FROM scores s
      WHERE s.user_id = u.user_id
        AND (s.created_at AT TIME ZONE u.timezone) >= date_trunc('day', NOW() AT TIME ZONE u.timezone)
        AND (s.created_at AT TIME ZONE u.timezone) < date_trunc('day', NOW() AT TIME ZONE u.timezone) + INTERVAL '1 day'
    )
`;

module.exports = {
  listMemberAlerts,
  listTokensForUsers,
  listReminderCandidates,
};
