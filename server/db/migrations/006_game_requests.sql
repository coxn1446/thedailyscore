-- Requests for a daily game the parsers do not recognize yet.

CREATE TABLE IF NOT EXISTS game_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  game_name VARCHAR(80) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_requests_user_idx ON game_requests (user_id);
