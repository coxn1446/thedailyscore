-- The Daily Score schema (greenfield).
-- Local:
--   createdb thedailyscore
--   psql -d thedailyscore -f server/db/schema.sql
-- Cloud SQL (qa/prod schemas): set search_path first, then run this file.
-- Existing databases: npm run db:migrate

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  handle VARCHAR(24) UNIQUE,
  password VARCHAR(255),
  google_id VARCHAR(255),
  apple_id VARCHAR(255),
  display_name VARCHAR(80),
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  portrait_url TEXT,
  dispatch_mode VARCHAR(16) NOT NULL DEFAULT 'preview',
  remind_daily BOOLEAN NOT NULL DEFAULT TRUE,
  alert_crown BOOLEAN NOT NULL DEFAULT TRUE,
  alert_new_member BOOLEAN NOT NULL DEFAULT FALSE,
  notifications BOOLEAN NOT NULL DEFAULT TRUE,
  night_mode BOOLEAN NOT NULL DEFAULT FALSE,
  feed_scope VARCHAR(16) NOT NULL DEFAULT 'everyone',
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  tos_accepted_version VARCHAR(32),
  privacy_accepted_version VARCHAR(32),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token_hash VARCHAR(64),
  email_verify_expires_at TIMESTAMPTZ,
  password_reset_token_hash VARCHAR(64),
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_handle_format CHECK (
    handle IS NULL OR handle ~ '^[a-z0-9_]{3,24}$'
  ),
  CONSTRAINT users_dispatch_mode_check CHECK (dispatch_mode IN ('preview', 'auto')),
  CONSTRAINT users_feed_scope_check CHECK (feed_scope IN ('everyone', 'friends'))
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_uidx
  ON users (google_id)
  WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_uidx
  ON users (apple_id)
  WHERE apple_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_verify_token_hash_uidx
  ON users (email_verify_token_hash)
  WHERE email_verify_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_password_reset_token_hash_uidx
  ON users (password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_handle_idx ON users (handle);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- A new game is a row here. Rank columns decide the board; parsers key off slug.
-- score + daily + higher: highest score that day wins. Day resets at resets_at.
-- guesses + weekly + lower: average guesses for the week. min_entries must be met.
-- guess_cap limits a solve (Wordle is 6). Null means the guess count is open.
-- resets_at is the time of day in the group's timezone. Default is midnight.

CREATE TABLE IF NOT EXISTS games (
  game_id SERIAL PRIMARY KEY,
  slug VARCHAR(32) NOT NULL UNIQUE,
  name VARCHAR(40) NOT NULL UNIQUE,
  sort_direction VARCHAR(8) NOT NULL,
  rank_basis VARCHAR(16) NOT NULL,
  board VARCHAR(16) NOT NULL,
  min_entries INTEGER,
  guess_cap INTEGER,
  resets_at TIME NOT NULL DEFAULT '00:00',
  sort_order INTEGER NOT NULL,
  CONSTRAINT games_sort_direction_check CHECK (sort_direction IN ('lower', 'higher')),
  CONSTRAINT games_rank_basis_check CHECK (rank_basis IN ('score', 'guesses')),
  CONSTRAINT games_board_check CHECK (board IN ('daily', 'weekly')),
  CONSTRAINT games_min_entries_check CHECK (min_entries IS NULL OR min_entries > 0),
  CONSTRAINT games_guess_cap_check CHECK (guess_cap IS NULL OR guess_cap > 0)
);

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, guess_cap, resets_at, sort_order)
VALUES
  ('map-tap', 'Map Tap', 'higher', 'score', 'daily', NULL, NULL, '00:00', 1),
  ('krillion', 'Krillion', 'higher', 'score', 'daily', NULL, NULL, '00:00', 2),
  ('size-it-up', 'Size it Up', 'higher', 'score', 'daily', NULL, NULL, '00:00', 3),
  ('wordle', 'Wordle', 'lower', 'guesses', 'weekly', 4, 6, '00:00', 4),
  ('redactle', 'Redactle', 'lower', 'guesses', 'daily', NULL, NULL, '00:00', 5),
  ('time-guesser', 'Time Guesser', 'higher', 'score', 'daily', NULL, NULL, '00:00', 6),
  ('semantle', 'Semantle', 'lower', 'guesses', 'daily', NULL, NULL, '00:00', 7),
  ('farflung', 'Farflung', 'higher', 'score', 'daily', NULL, NULL, '00:00', 8),
  ('eraly', 'Eraly', 'higher', 'score', 'daily', NULL, NULL, '00:00', 9),
  ('fermi', 'Fermi', 'lower', 'score', 'daily', NULL, NULL, '00:00', 10),
  ('hivemind', 'Hivemind', 'higher', 'score', 'daily', NULL, NULL, '00:00', 11),
  ('noillirk', 'Noillirk', 'higher', 'score', 'daily', NULL, NULL, '00:00', 12)
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
  alert_messages BOOLEAN NOT NULL DEFAULT TRUE,
  alert_scores BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_members_role_check CHECK (role IN ('curator', 'fellow'))
);

CREATE INDEX IF NOT EXISTS group_members_user_idx ON group_members (user_id);

CREATE TABLE IF NOT EXISTS group_games (
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  active_on DATE,
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

-- One row per player, game, and puzzle. A second paste of that day is rejected.
-- score is the points total when rank_basis = score.
-- Fermi stores the printed multiple, so the column is numeric. Lower wins.
-- guesses is the solve count when rank_basis = guesses.
-- Wordle leaves guesses null when unsolved. Redactle stores the count either way.
-- duration_seconds and hints are set for games that report them.

CREATE TABLE IF NOT EXISTS scores (
  score_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id),
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  puzzle_number INTEGER NOT NULL,
  raw_paste TEXT NOT NULL,
  snippet TEXT NOT NULL,
  image_url TEXT, -- picture from POST /api/uploads, or null
  score NUMERIC(12, 2),
  guesses INTEGER,
  solved BOOLEAN NOT NULL DEFAULT TRUE,
  duration_seconds INTEGER,
  hints INTEGER,
  played_on DATE NOT NULL, -- puzzle post day, not the upload day
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scores_puzzle_number_check CHECK (puzzle_number >= 0),
  CONSTRAINT scores_score_check CHECK (score IS NULL OR score >= 0),
  CONSTRAINT scores_guesses_check CHECK (guesses IS NULL OR (guesses >= 1 AND guesses <= 9999)),
  CONSTRAINT scores_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  CONSTRAINT scores_hints_check CHECK (hints IS NULL OR hints >= 0),
  CONSTRAINT scores_value_check CHECK (
    (score IS NOT NULL AND guesses IS NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NOT NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NULL AND solved = FALSE)
    OR (score IS NULL AND guesses IS NOT NULL AND solved = FALSE)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS scores_user_game_puzzle_uidx
  ON scores (user_id, game_id, puzzle_number);

CREATE INDEX IF NOT EXISTS scores_game_puzzle_idx
  ON scores (game_id, puzzle_number);

CREATE INDEX IF NOT EXISTS scores_game_updated_idx
  ON scores (game_id, updated_at);

CREATE INDEX IF NOT EXISTS scores_created_idx
  ON scores (created_at DESC, score_id DESC);

-- Where a score was confirmed. Replaced on each post for that score.
CREATE TABLE IF NOT EXISTS score_publications (
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (score_id, group_id)
);

CREATE INDEX IF NOT EXISTS score_publications_group_idx
  ON score_publications (group_id);

-- One like per reader per score.
CREATE TABLE IF NOT EXISTS score_likes (
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (score_id, user_id)
);

-- A short note on a filed score. The author can delete it.
CREATE TABLE IF NOT EXISTS score_comments (
  comment_id SERIAL PRIMARY KEY,
  score_id INTEGER NOT NULL REFERENCES scores (score_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT score_comments_body_check CHECK (
    char_length(btrim(body)) <= 500
    AND (char_length(btrim(body)) >= 1 OR image_url IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS score_comments_score_created_idx
  ON score_comments (score_id, created_at, comment_id);

DROP TRIGGER IF EXISTS scores_set_updated_at ON scores;
CREATE TRIGGER scores_set_updated_at
  BEFORE UPDATE ON scores
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- A signed-in reader asks for a game the parsers do not recognize yet.
CREATE TABLE IF NOT EXISTS game_requests (
  request_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  game_name VARCHAR(80) NOT NULL,
  note TEXT,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS game_requests_user_idx ON game_requests (user_id);

-- One parlor per group, created with the group. Members post text.
CREATE TABLE IF NOT EXISTS parlors (
  parlor_id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL UNIQUE REFERENCES groups (group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS parlor_messages (
  message_id SERIAL PRIMARY KEY,
  parlor_id INTEGER NOT NULL REFERENCES parlors (parlor_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parlor_messages_body_check CHECK (char_length(body) BETWEEN 1 AND 2000),
  CONSTRAINT parlor_messages_kind_check CHECK (kind IN ('chat', 'standings'))
);

CREATE INDEX IF NOT EXISTS parlor_messages_game_idx
  ON parlor_messages (parlor_id, game_id, message_id DESC);

-- One reaction per member per message. Sending the same kind again removes it.
CREATE TABLE IF NOT EXISTS parlor_reactions (
  message_id INTEGER NOT NULL REFERENCES parlor_messages (message_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT parlor_reactions_kind_check CHECK (
    kind IN ('heart', 'up', 'down', 'haha', 'exclaim', 'question')
  )
);

CREATE INDEX IF NOT EXISTS parlor_reactions_message_idx ON parlor_reactions (message_id);

-- How far each member has read a parlor. Unread is every later message from someone else.
CREATE TABLE IF NOT EXISTS parlor_reads (
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id),
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id, game_id)
);

DROP TRIGGER IF EXISTS parlor_reads_set_updated_at ON parlor_reads;
CREATE TRIGGER parlor_reads_set_updated_at
  BEFORE UPDATE ON parlor_reads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Capacitor push token. One row per device. Sign-out deletes the caller's token.
CREATE TABLE IF NOT EXISTS device_tokens (
  device_token_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  fcm_token TEXT NOT NULL UNIQUE,
  platform VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_tokens_platform_check CHECK (platform IN ('ios', 'android', 'web'))
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON device_tokens (user_id);

DROP TRIGGER IF EXISTS device_tokens_set_updated_at ON device_tokens;
CREATE TRIGGER device_tokens_set_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- One row per directed request. The other direction of a pending pair is an accept.
CREATE TABLE IF NOT EXISTS friendships (
  friendship_id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_distinct CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT friendships_pair_uidx UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id, status);

DROP TRIGGER IF EXISTS friendships_set_updated_at ON friendships;
CREATE TRIGGER friendships_set_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Games a reader is playing. No row means the catalog game stays on.
CREATE TABLE IF NOT EXISTS user_games (
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games (game_id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER,
  PRIMARY KEY (user_id, game_id)
);

CREATE INDEX IF NOT EXISTS user_games_user_idx ON user_games (user_id);

-- A like, a comment, or a friend request for one reader.
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

-- An error a reader sent to the admin desk.
CREATE TABLE IF NOT EXISTS bug_reports (
  bug_report_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  detail TEXT,
  seen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bug_reports_user_idx ON bug_reports (user_id);
