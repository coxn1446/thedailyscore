const PAIR_FIELDS = `
  friendship_id,
  requester_id,
  addressee_id,
  status,
  created_at,
  updated_at
`;

const findPair = `
  SELECT ${PAIR_FIELDS}
  FROM friendships
  WHERE (requester_id = $1 AND addressee_id = $2)
     OR (requester_id = $2 AND addressee_id = $1)
`;

const insertRequest = `
  INSERT INTO friendships (requester_id, addressee_id, status)
  VALUES ($1, $2, 'pending')
  RETURNING ${PAIR_FIELDS}
`;

const rewriteRequest = `
  UPDATE friendships
  SET requester_id = $2,
      addressee_id = $3,
      status = 'pending'
  WHERE friendship_id = $1
  RETURNING ${PAIR_FIELDS}
`;

const acceptRequest = `
  UPDATE friendships
  SET status = 'accepted'
  WHERE friendship_id = $1
    AND addressee_id = $2
    AND status = 'pending'
  RETURNING ${PAIR_FIELDS}
`;

const declineRequest = `
  UPDATE friendships
  SET status = 'declined'
  WHERE friendship_id = $1
    AND addressee_id = $2
    AND status = 'pending'
  RETURNING ${PAIR_FIELDS}
`;

const deleteForUser = `
  DELETE FROM friendships
  WHERE friendship_id = $1
    AND (requester_id = $2 OR addressee_id = $2)
  RETURNING friendship_id
`;

const listForUser = `
  SELECT
    f.friendship_id,
    f.status,
    f.requester_id,
    f.addressee_id,
    u.user_id,
    u.handle,
    u.display_name,
    u.portrait_url
  FROM friendships f
  JOIN users u ON u.user_id = CASE
    WHEN f.requester_id = $1 THEN f.addressee_id
    ELSE f.requester_id
  END
  WHERE (f.requester_id = $1 OR f.addressee_id = $1)
    AND f.status <> 'declined'
  ORDER BY u.handle ASC, f.friendship_id ASC
`;

const listAcceptedIds = `
  SELECT CASE
    WHEN requester_id = $1 THEN addressee_id
    ELSE requester_id
  END AS user_id
  FROM friendships
  WHERE status = 'accepted'
    AND (requester_id = $1 OR addressee_id = $1)
`;

const searchHandles = `
  SELECT
    u.user_id,
    u.handle,
    u.display_name,
    u.portrait_url,
    f.friendship_id,
    f.status,
    f.requester_id
  FROM users u
  LEFT JOIN friendships f
    ON (
      (f.requester_id = $1 AND f.addressee_id = u.user_id)
      OR (f.addressee_id = $1 AND f.requester_id = u.user_id)
    )
  WHERE u.user_id <> $1
    AND u.suspended = FALSE
    AND u.handle LIKE $2 || '%' ESCAPE '\\'
  ORDER BY u.handle ASC, u.user_id ASC
  LIMIT 8
`;

module.exports = {
  findPair,
  insertRequest,
  rewriteRequest,
  acceptRequest,
  declineRequest,
  deleteForUser,
  listForUser,
  listAcceptedIds,
  searchHandles,
};
