# Database Schema Documentation

Last Updated: 2026-09-28

Local database name: `thedailyscore`.

On shared Cloud SQL, set `search_path` to `qa` or `prod` before applying `server/db/schema.sql` or `npm run db:migrate`.

## Tables

### users

- **Purpose**: Account identity for sign-in and the handle gate before chrome.
- **Columns**:
  - user_id (SERIAL PRIMARY KEY)
  - email (VARCHAR(255) UNIQUE NOT NULL) — stored lowercase
  - handle (VARCHAR(24) UNIQUE) — lowercase; null until a Google or Apple account chooses one
  - password (VARCHAR(255)) — bcrypt hash; null for OAuth-only accounts
  - google_id (VARCHAR(255))
  - apple_id (VARCHAR(255))
  - display_name (VARCHAR(80))
  - timezone (VARCHAR(64) NOT NULL DEFAULT 'UTC') — IANA zone from the client at registration, handle claim, or profile
  - portrait_url (TEXT) — square portrait from `POST /api/uploads`
  - dispatch_mode (VARCHAR(16) NOT NULL DEFAULT 'preview') — `preview` or `auto`
  - remind_daily (BOOLEAN NOT NULL DEFAULT TRUE) — 8pm reminder when no score was posted on the local date
  - alert_crown (BOOLEAN NOT NULL DEFAULT TRUE) — push when someone else takes rank 1 on one game’s board
  - alert_new_member (BOOLEAN NOT NULL DEFAULT FALSE) — push when someone else joins a group
  - suspended (BOOLEAN NOT NULL DEFAULT FALSE)
  - tos_accepted_version (VARCHAR(32))
  - privacy_accepted_version (VARCHAR(32))
  - email_verified (BOOLEAN NOT NULL DEFAULT FALSE)
  - email_verify_token_hash (VARCHAR(64))
  - email_verify_expires_at (TIMESTAMPTZ)
  - password_reset_token_hash (VARCHAR(64))
  - password_reset_expires_at (TIMESTAMPTZ)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - users_email_key — unique email
  - users_handle_key — unique handle
  - users_handle_idx — handle lookup
  - users_google_id_uidx — unique Google subject when present
  - users_apple_id_uidx — unique Apple subject when present
  - users_email_verify_token_hash_uidx
  - users_password_reset_token_hash_uidx
- **Checks**:
  - `users_handle_format` requires `^[a-z0-9_]{3,24}$` when handle is set
  - `users_dispatch_mode_check` allows `preview` or `auto`
- **Foreign Keys**: None
- **Triggers**: `users_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-27

### games

- **Purpose**: Catalog of daily games. A new game is a row in this table plus one parser module registered in `server/parsers`. Ranking reads these columns; it does not hardcode titles. Parsers key off `slug`.
- **Columns**:
  - game_id (SERIAL PRIMARY KEY)
  - slug (VARCHAR(32) UNIQUE NOT NULL)
  - name (VARCHAR(40) UNIQUE NOT NULL)
  - sort_direction (VARCHAR(8) NOT NULL) — `lower` or `higher`
  - rank_basis (VARCHAR(16) NOT NULL) — `score` (a points total) or `guesses` (no points score)
  - board (VARCHAR(16) NOT NULL) — `daily` or `weekly`. Each game has its own board. There is no combined scoreboard.
  - min_entries (INTEGER) — submissions required before a player is ranked. Null means every submission counts. Weekly guess boards use 4.
  - resets_at (TIME NOT NULL DEFAULT '00:00') — day boundary in the group timezone. Midnight for every current game.
  - sort_order (INTEGER NOT NULL) — switcher order
- **Indexes**:
  - games_slug_key — unique slug
  - games_name_key — unique name
- **Checks**:
  - `games_sort_direction_check` allows `lower` or `higher`
  - `games_rank_basis_check` allows `score` or `guesses`
  - `games_board_check` allows `daily` or `weekly`
  - `games_min_entries_check` requires null or a positive count
- **Foreign Keys**: None
- **Triggers**: None
- **Seed**:
  - Map Tap — `higher`, `score`, `daily`, resets `00:00`
  - Krillion — `higher`, `score`, `daily`, resets `00:00`
  - Size it Up — `higher`, `score`, `daily`, resets `00:00`
  - Wordle — `lower`, `guesses`, `weekly`, `min_entries` 4, resets `00:00`. The week runs Monday 00:00 to the next Monday 00:00 in the group timezone. A player needs four solved puzzles that week. Rank is the average guess count.
- **Last Modified**: 2026-09-27

### groups

- **Purpose**: A chartered syndicate. The timezone is the creator’s at charter and defines “today” for later feeds.
- **Columns**:
  - group_id (SERIAL PRIMARY KEY)
  - name (VARCHAR(80) NOT NULL)
  - tagline (VARCHAR(160))
  - timezone (VARCHAR(64) NOT NULL DEFAULT 'UTC')
  - invite_token (VARCHAR(64) UNIQUE NOT NULL)
  - archived (BOOLEAN NOT NULL DEFAULT FALSE) — hidden from directories; rejects new joins
  - created_by (INTEGER NOT NULL)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - groups_invite_token_key — join by token
- **Checks**: None
- **Foreign Keys**:
  - created_by → users(user_id)
- **Triggers**: `groups_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-27

### group_members

- **Purpose**: Who belongs to a group, as `curator` or `fellow`.
- **Columns**:
  - group_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL)
  - role (VARCHAR(16) NOT NULL) — `curator` or `fellow`
  - alert_messages (BOOLEAN NOT NULL DEFAULT TRUE) — push when someone else messages the parlor and this member has no socket
  - alert_scores (BOOLEAN NOT NULL DEFAULT TRUE) — push when someone else posts a score to the group
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - group_members_pkey — (group_id, user_id)
  - group_members_user_idx — directory lookup by reader
- **Checks**: `group_members_role_check` allows `curator` or `fellow`
- **Foreign Keys**:
  - group_id → groups(group_id) ON DELETE CASCADE
  - user_id → users(user_id)
- **Triggers**: None
- **Last Modified**: 2026-09-27

### group_games

- **Purpose**: Which catalog games a group tracks. Charter inserts one row per game. `enabled` is true for the games picked at charter. Turning a game off sets `enabled` to false and keeps the row so later scores are not deleted with the toggle.
- **Columns**:
  - group_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - enabled (BOOLEAN NOT NULL DEFAULT TRUE)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - group_games_pkey — (group_id, game_id)
- **Checks**: None
- **Foreign Keys**:
  - group_id → groups(group_id) ON DELETE CASCADE
  - game_id → games(game_id)
- **Triggers**: `group_games_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-27

### scores

- **Purpose**: One parsed result per player, game, and puzzle. A second paste of that puzzle is rejected. An older puzzle number backfills that day. `score` is the points total when the game’s `rank_basis` is `score`. `guesses` is the solve count when `rank_basis` is `guesses`. An unsolved guess game stores neither number and `solved` is false, so it stays out of the rank.
- **Columns**:
  - score_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - puzzle_number (INTEGER NOT NULL) — Map Tap counts calendar days since 21 June 2024
  - raw_paste (TEXT NOT NULL)
  - snippet (TEXT NOT NULL) — the share grid shown on Home
  - score (INTEGER) — null for guess games
  - guesses (INTEGER) — 1–6 when solved; null for score games and unsolved Wordle
  - solved (BOOLEAN NOT NULL DEFAULT TRUE)
  - played_on (DATE NOT NULL) — the day the puzzle was posted. Krillion #1 is 16 July 2026. Map Tap #0 is 21 June 2024. Wordle 1 is 19 June 2021. Size It Up #1 is 4 September 2026. Not the upload day.
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - scores_user_game_puzzle_uidx — unique (user_id, game_id, puzzle_number)
  - scores_game_puzzle_idx — Wordle board for one puzzle
  - scores_game_updated_idx — daily board by log time
- **Checks**:
  - `scores_puzzle_number_check` requires `puzzle_number >= 0`
  - `scores_score_check` requires a null or non-negative score
  - `scores_guesses_check` requires null or 1–6
  - `scores_value_check` allows a score, a guess count, or an unsolved row with both null
- **Foreign Keys**:
  - user_id → users(user_id)
  - game_id → games(game_id)
- **Triggers**: `scores_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-27

### score_publications

- **Purpose**: Groups that received a confirmed result. Confirm replaces the rows for that score. A personal score with no matching group has none.
- **Columns**:
  - score_id (INTEGER NOT NULL)
  - group_id (INTEGER NOT NULL)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - score_publications_pkey — (score_id, group_id)
  - score_publications_group_idx — board lookup by group
- **Checks**: None
- **Foreign Keys**:
  - score_id → scores(score_id) ON DELETE CASCADE
  - group_id → groups(group_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-09-27

### game_requests

- **Purpose**: A signed-in reader asks for a daily game the parsers do not recognize yet.
- **Columns**:
  - request_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - game_name (VARCHAR(80) NOT NULL)
  - note (TEXT)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - game_requests_user_idx — requests by reader
- **Checks**: None
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-09-27

### parlors

- **Purpose**: One parlor per group, created in the same transaction as the group.
- **Columns**:
  - parlor_id (SERIAL PRIMARY KEY)
  - group_id (INTEGER NOT NULL UNIQUE)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - parlors_group_id_key — one parlor per group
- **Checks**: None
- **Foreign Keys**:
  - group_id → groups(group_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-09-28

### parlor_messages

- **Purpose**: Text messages in one group and one game. Members only, and only after that member posts that game today. History is paged by `message_id`.
- **Columns**:
  - message_id (SERIAL PRIMARY KEY)
  - parlor_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL)
  - body (TEXT NOT NULL) — 1 to 2000 characters
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - parlor_messages_game_idx — (parlor_id, game_id, message_id DESC)
- **Checks**: `parlor_messages_body_check` requires `char_length(body)` between 1 and 2000
- **Foreign Keys**:
  - parlor_id → parlors(parlor_id) ON DELETE CASCADE
  - game_id → games(game_id)
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-09-28

### parlor_reactions

- **Purpose**: One reaction per member per parlor message. The same kind again removes it.
- **Columns**:
  - message_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL)
  - kind (VARCHAR(16) NOT NULL) — `heart`, `up`, `down`, `haha`, `exclaim`, or `question`
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - parlor_reactions_pkey — (message_id, user_id)
  - parlor_reactions_message_idx — reactions on one message
- **Checks**: `parlor_reactions_kind_check`
- **Foreign Keys**:
  - message_id → parlor_messages(message_id) ON DELETE CASCADE
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-09-28

### parlor_reads

- **Purpose**: How far a member has read one group-and-game conversation. Unread messages are later than `last_read_message_id` and from someone else.
- **Columns**:
  - user_id (INTEGER NOT NULL)
  - group_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - last_read_message_id (INTEGER NOT NULL DEFAULT 0)
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - parlor_reads_pkey — (user_id, group_id, game_id)
- **Checks**: None
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
  - group_id → groups(group_id) ON DELETE CASCADE
  - game_id → games(game_id)
- **Triggers**: `parlor_reads_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-28

### device_tokens

- **Purpose**: Capacitor push token for the signed-in reader. Register after sign-in. Delete that token on sign-out.
- **Columns**:
  - device_token_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - token (TEXT NOT NULL UNIQUE)
  - platform (VARCHAR(16) NOT NULL) — `ios`, `android`, or `web`
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - device_tokens_token_key — unique token
  - device_tokens_user_idx — tokens for one reader
- **Checks**: `device_tokens_platform_check` allows `ios`, `android`, or `web`
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: `device_tokens_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-28

### session

Created by `connect-pg-simple` when the pool is healthy (`createTableIfMissing`). Stores Express sessions.

## Functions

### set_updated_at()

- **Purpose**: Sets `updated_at` to `NOW()` before a row update
- **Returns**: TRIGGER
- **Last Modified**: 2026-09-27

## Migrations

### 001_users.sql

- Created `users` and the `set_updated_at` trigger
- **Last Modified**: 2026-09-27

### 002_groups.sql

- Created `games`, `groups`, `group_members`, and `group_games`
- **Last Modified**: 2026-09-27

### 003_game_catalog.sql

- Narrowed `games` to Map Tap, Krillion, Size it Up, and Wordle
- Added `rank_basis`, `board`, `min_entries`, and `resets_at`
- **Last Modified**: 2026-09-27

### 004_scores.sql

- Created `scores` and `score_publications`
- **Last Modified**: 2026-09-27

### 005_profile.sql

- Added `portrait_url`, `dispatch_mode`, `remind_daily`, `alert_crown`, and `alert_new_member` on `users`
- **Last Modified**: 2026-09-27

### 006_game_requests.sql

- Created `game_requests`
- **Last Modified**: 2026-09-27

### 012_parlor_games.sql

- Added `game_id` on `parlor_messages` and `parlor_reads`
- Removed messages and read cursors that had no game
- **Last Modified**: 2026-09-28

### 011_reactions_and_alerts.sql

- Added `alert_messages` and `alert_scores` on `group_members`
- Created `parlor_reactions`
- **Last Modified**: 2026-09-28

### 010_parlor_reads.sql

- Created `parlor_reads`
- **Last Modified**: 2026-09-28

### 009_parlor_and_devices.sql

- Created `parlors`, `parlor_messages`, and `device_tokens`
- Backfilled one parlor for each existing group
- **Last Modified**: 2026-09-28
