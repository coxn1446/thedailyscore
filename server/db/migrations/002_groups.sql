-- Game catalog, groups, membership, and per-group game toggles.
-- Locked rank rules (sort_direction is the primary order):
-- Wordle, Nerdle: lower (fewer guesses; a loss ranks after every win)
-- Krillion: lower (275 ranks ahead of 311)
-- Connections: lower (fewer mistakes)
-- Map Tap: higher (points)
-- The Mini Crossword, Pips: lower (time)
-- Waffle: lower (fewer mistakes, then higher star count)

CREATE TABLE IF NOT EXISTS games (
  game_id SERIAL PRIMARY KEY,
  slug VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(40) NOT NULL UNIQUE,
  sort_direction VARCHAR(8) NOT NULL,
  sort_order INTEGER NOT NULL,
  CONSTRAINT games_sort_direction_check CHECK (sort_direction IN ('lower', 'higher'))
);

INSERT INTO games (slug, name, sort_direction, sort_order)
VALUES
  ('wordle', 'Wordle', 'lower', 1),
  ('krillion', 'Krillion', 'lower', 2),
  ('connections', 'Connections', 'lower', 3),
  ('map-tap', 'Map Tap', 'higher', 4),
  ('mini-crossword', 'The Mini Crossword', 'lower', 5),
  ('nerdle', 'Nerdle', 'lower', 6),
  ('waffle', 'Waffle', 'lower', 7),
  ('pips', 'Pips', 'lower', 8)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS groups (
  group_id SERIAL PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  tagline VARCHAR(160),
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  invite_token VARCHAR(64) NOT NULL UNIQUE,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INTEGER NOT NULL REFERENCES users (user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_members (
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id),
  role VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('curator', 'fellow'))
);

CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id);

CREATE TABLE IF NOT EXISTS group_games (
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, game_id)
);

DROP TRIGGER IF EXISTS groups_set_updated_at ON groups;
CREATE TRIGGER groups_set_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS group_games_set_updated_at ON group_games;
CREATE TRIGGER group_games_set_updated_at
  BEFORE UPDATE ON group_games
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
