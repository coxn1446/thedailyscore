const insertRequest = `
  INSERT INTO game_requests (user_id, game_name, note)
  VALUES ($1, $2, $3)
  RETURNING request_id, user_id, game_name, note, seen, created_at
`;

const listRequests = `
  SELECT
    r.request_id,
    r.game_name,
    r.note,
    r.seen,
    r.created_at,
    u.handle,
    u.display_name
  FROM game_requests r
  JOIN users u ON u.user_id = r.user_id
  ORDER BY r.created_at DESC, r.request_id DESC
`;

const countUnseen = `
  SELECT COUNT(*)::int AS count
  FROM game_requests
  WHERE seen = FALSE
`;

const markSeen = `
  UPDATE game_requests
  SET seen = TRUE
  WHERE seen = FALSE
`;

module.exports = {
  insertRequest,
  listRequests,
  countUnseen,
  markSeen,
};
