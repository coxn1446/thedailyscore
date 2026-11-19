-- Games a reader has turned on or off. A missing row stays on.

CREATE TABLE IF NOT EXISTS user_games (
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS user_games_user_idx ON user_games (user_id);
