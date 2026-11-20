-- Feed choice, notifications, bug reports, and a reader's game order.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS feed_scope VARCHAR(16) NOT NULL DEFAULT 'everyone';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_feed_scope_check;
ALTER TABLE users
  ADD CONSTRAINT users_feed_scope_check CHECK (feed_scope IN ('everyone', 'friends'));

ALTER TABLE user_games
  ADD COLUMN IF NOT EXISTS sort_order INTEGER;

CREATE TABLE IF NOT EXISTS notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users (user_id) ON DELETE SET NULL,
  kind VARCHAR(16) NOT NULL,
  score_id INTEGER REFERENCES scores (score_id) ON DELETE CASCADE,
  friendship_id INTEGER REFERENCES friendships (friendship_id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_kind_check CHECK (kind IN ('like', 'comment', 'friend_request'))
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx
  ON notifications (user_id)
  WHERE read_at IS NULL;

CREATE TABLE IF NOT EXISTS bug_reports (
  bug_report_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  detail TEXT,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bug_reports_user_idx ON bug_reports (user_id);
