const insertNotification = `
  INSERT INTO notifications (user_id, actor_id, kind, score_id, friendship_id)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING notification_id
`;

const listNotifications = `
  SELECT
    n.notification_id,
    n.kind,
    n.score_id,
    n.friendship_id,
    n.read_at,
    n.created_at,
    a.user_id AS actor_id,
    a.handle,
    a.display_name,
    a.portrait_url,
    f.status AS friendship_status,
    ga.slug,
    ga.name AS game_name
  FROM notifications n
  LEFT JOIN users a ON a.user_id = n.actor_id
  LEFT JOIN friendships f ON f.friendship_id = n.friendship_id
  LEFT JOIN scores s ON s.score_id = n.score_id
  LEFT JOIN games ga ON ga.game_id = s.game_id
  WHERE n.user_id = $1
  ORDER BY n.created_at DESC, n.notification_id DESC
  LIMIT 50
`;

const countUnread = `
  SELECT COUNT(*)::int AS count
  FROM notifications
  WHERE user_id = $1
    AND read_at IS NULL
`;

const markRead = `
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = $1
    AND read_at IS NULL
`;

module.exports = {
  insertNotification,
  listNotifications,
  countUnread,
  markRead,
};
