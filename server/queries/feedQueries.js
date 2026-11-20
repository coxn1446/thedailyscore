const listFeed = `
  SELECT
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.snippet,
    s.score,
    s.guesses,
    s.solved,
    s.played_on,
    s.image_url,
    s.created_at,
    u.handle,
    u.display_name,
    u.portrait_url,
    ga.slug,
    ga.name AS game_name,
    ga.rank_basis,
    ga.guess_cap,
    (SELECT COUNT(*)::int FROM score_likes l WHERE l.score_id = s.score_id) AS like_count,
    EXISTS (
      SELECT 1 FROM score_likes l WHERE l.score_id = s.score_id AND l.user_id = $1
    ) AS liked,
    (SELECT COUNT(*)::int FROM score_comments c WHERE c.score_id = s.score_id) AS comment_count
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  JOIN games ga ON ga.game_id = s.game_id
  WHERE u.suspended = FALSE
  ORDER BY s.created_at DESC, s.score_id DESC
  LIMIT 40
`;

const listFriendsFeed = `
  SELECT
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.snippet,
    s.score,
    s.guesses,
    s.solved,
    s.played_on,
    s.image_url,
    s.created_at,
    u.handle,
    u.display_name,
    u.portrait_url,
    ga.slug,
    ga.name AS game_name,
    ga.rank_basis,
    ga.guess_cap,
    (SELECT COUNT(*)::int FROM score_likes l WHERE l.score_id = s.score_id) AS like_count,
    EXISTS (
      SELECT 1 FROM score_likes l WHERE l.score_id = s.score_id AND l.user_id = $1
    ) AS liked,
    (SELECT COUNT(*)::int FROM score_comments c WHERE c.score_id = s.score_id) AS comment_count
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  JOIN games ga ON ga.game_id = s.game_id
  WHERE u.suspended = FALSE
    AND (
      s.user_id = $1
      OR EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
          AND (
            (f.requester_id = $1 AND f.addressee_id = s.user_id)
            OR (f.addressee_id = $1 AND f.requester_id = s.user_id)
          )
      )
    )
  ORDER BY s.created_at DESC, s.score_id DESC
  LIMIT 40
`;

const findScope = `
  SELECT feed_scope
  FROM users
  WHERE user_id = $1
`;

const dayAverage = `
  SELECT
    ROUND(AVG(s.score)::numeric, 2) AS average_score,
    ROUND(AVG(s.guesses) FILTER (WHERE s.solved AND s.guesses IS NOT NULL)::numeric, 1) AS average_guesses
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.game_id = (SELECT game_id FROM scores WHERE score_id = $1)
    AND s.puzzle_number = (SELECT puzzle_number FROM scores WHERE score_id = $1)
    AND u.suspended = FALSE
`;

const findViewerScore = `
  SELECT
    s.score_id,
    s.puzzle_number,
    s.snippet,
    s.score,
    s.guesses,
    s.solved,
    s.played_on,
    ga.slug,
    ga.name AS game_name,
    ga.rank_basis,
    ga.guess_cap
  FROM scores s
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.user_id = $1
    AND s.game_id = (SELECT game_id FROM scores WHERE score_id = $2)
    AND s.puzzle_number = (SELECT puzzle_number FROM scores WHERE score_id = $2)
    AND s.score_id <> $2
  ORDER BY s.created_at DESC, s.score_id DESC
  LIMIT 1
`;

const findPost = `
  SELECT
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.snippet,
    s.score,
    s.guesses,
    s.solved,
    s.played_on,
    s.image_url,
    s.created_at,
    u.handle,
    u.display_name,
    u.portrait_url,
    ga.slug,
    ga.name AS game_name,
    ga.rank_basis,
    ga.guess_cap,
    (SELECT COUNT(*)::int FROM score_likes l WHERE l.score_id = s.score_id) AS like_count,
    EXISTS (
      SELECT 1 FROM score_likes l WHERE l.score_id = s.score_id AND l.user_id = $1
    ) AS liked,
    (SELECT COUNT(*)::int FROM score_comments c WHERE c.score_id = s.score_id) AS comment_count
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.score_id = $2
    AND u.suspended = FALSE
`;

const findScore = `
  SELECT s.score_id, s.user_id, u.suspended
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.score_id = $1
`;

const insertLike = `
  INSERT INTO score_likes (score_id, user_id)
  VALUES ($1, $2)
  ON CONFLICT (score_id, user_id) DO NOTHING
  RETURNING score_id
`;

const deleteLike = `
  DELETE FROM score_likes
  WHERE score_id = $1
    AND user_id = $2
`;

const countLikes = `
  SELECT
    (SELECT COUNT(*)::int FROM score_likes WHERE score_id = $1) AS like_count,
    EXISTS (
      SELECT 1 FROM score_likes WHERE score_id = $1 AND user_id = $2
    ) AS liked
`;

const listComments = `
  SELECT
    c.comment_id,
    c.body,
    c.image_url,
    c.created_at,
    c.user_id,
    u.handle,
    u.display_name,
    u.portrait_url
  FROM score_comments c
  JOIN users u ON u.user_id = c.user_id
  WHERE c.score_id = $1
    AND u.suspended = FALSE
  ORDER BY c.created_at ASC, c.comment_id ASC
`;

const insertComment = `
  INSERT INTO score_comments (score_id, user_id, body, image_url)
  VALUES ($1, $2, $3, $4)
  RETURNING comment_id, body, image_url, created_at, user_id
`;

const findComment = `
  SELECT c.comment_id, c.user_id, c.score_id, u.suspended
  FROM score_comments c
  JOIN users u ON u.user_id = c.user_id
  WHERE c.comment_id = $1
`;

const deleteComment = `
  DELETE FROM score_comments
  WHERE comment_id = $1
    AND user_id = $2
`;

const findUser = `
  SELECT user_id, handle, display_name, portrait_url
  FROM users
  WHERE user_id = $1
`;

module.exports = {
  listFeed,
  listFriendsFeed,
  findScope,
  findViewerScore,
  dayAverage,
  findPost,
  findScore,
  insertLike,
  deleteLike,
  countLikes,
  listComments,
  insertComment,
  findComment,
  deleteComment,
  findUser,
};
