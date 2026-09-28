-- Personal results and the groups that received them.
-- Unique on user + game + puzzle. A second paste updates the row.

CREATE TABLE IF NOT EXISTS scores (
  score_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id),
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  puzzle_number INTEGER NOT NULL,
  raw_paste TEXT NOT NULL,
  snippet TEXT NOT NULL,
  score INTEGER,
  guesses INTEGER,
  solved BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scores_puzzle_number_check CHECK (puzzle_number >= 0),
  CONSTRAINT scores_score_check CHECK (score IS NULL OR score >= 0),
  CONSTRAINT scores_guesses_check CHECK (guesses IS NULL OR (guesses >= 1 AND guesses <= 6)),
  CONSTRAINT scores_value_check CHECK (
    (score IS NOT NULL AND guesses IS NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NOT NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NULL AND solved = FALSE)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS scores_user_game_puzzle_uidx
  ON scores (user_id, game_id, puzzle_number);

CREATE INDEX IF NOT EXISTS scores_game_puzzle_idx
  ON scores (game_id, puzzle_number);

CREATE INDEX IF NOT EXISTS scores_game_updated_idx
  ON scores (game_id, updated_at);

CREATE TABLE IF NOT EXISTS score_publications (
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (score_id, group_id)
);

CREATE INDEX IF NOT EXISTS score_publications_group_idx
  ON score_publications (group_id);

DROP TRIGGER IF EXISTS scores_set_updated_at ON scores;
CREATE TRIGGER scores_set_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
