-- Home feed: a picture on a score, one like per reader, and comments.

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS image_url TEXT;

CREATE INDEX IF NOT EXISTS scores_created_idx
  ON scores (created_at DESC, score_id DESC);

CREATE TABLE IF NOT EXISTS score_likes (
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (score_id, user_id)
);

CREATE TABLE IF NOT EXISTS score_comments (
  comment_id SERIAL PRIMARY KEY,
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_comments_body_check CHECK (char_length(btrim(body)) BETWEEN 1 AND 500)
);

CREATE INDEX IF NOT EXISTS score_comments_score_created_idx
  ON score_comments (score_id, created_at, comment_id);
