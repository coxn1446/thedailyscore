# Database Schema Documentation

Last Updated: 2026-11-19

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
  - notifications (BOOLEAN NOT NULL DEFAULT TRUE) — account switch for every push
  - night_mode (BOOLEAN NOT NULL DEFAULT FALSE) — account switch for the ink edition
  - feed_scope (VARCHAR(16) NOT NULL DEFAULT 'everyone') — `everyone` or `friends` for the Home feed
  - is_admin (BOOLEAN NOT NULL DEFAULT FALSE) — Admin nav and the game-request desk
  - suspended (BOOLEAN NOT NULL DEFAULT FALSE)
  - tos_accepted_version (VARCHAR(32)) — the Terms version the reader accepted. Null until they accept the current terms
  - privacy_accepted_version (VARCHAR(32)) — the Privacy Policy version the reader accepted. Null until they accept the current policy
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
  - `users_feed_scope_check` allows `everyone` or `friends`
- **Foreign Keys**: None
- **Triggers**: `users_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-11-19

### games

- **Purpose**: Catalog of daily games. A new game is a row in this table plus one parser module registered in `server/parsers`. Ranking reads these columns; it does not hardcode titles. Parsers key off `slug`.
- **Columns**:
  - game_id (SERIAL PRIMARY KEY)
  - slug (VARCHAR(32) UNIQUE NOT NULL)
  - name (VARCHAR(40) UNIQUE NOT NULL)
  - sort_direction (VARCHAR(8) NOT NULL) — `lower` or `higher`
  - rank_basis (VARCHAR(16) NOT NULL) — `score` (a points total) or `guesses` (no points score)
  - board (VARCHAR(16) NOT NULL) — `daily` or `weekly`. Each game has its own board. There is no combined scoreboard.
  - min_entries (INTEGER) — kept on the catalog row. Wordle is 4. The board ranks every attempt and does not use this as a gate.
  - guess_cap (INTEGER) — solved guesses must fall inside 1..cap when set. Wordle is 6. Null means the guess count is open.
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
  - `games_guess_cap_check` requires null or a positive cap
- **Foreign Keys**: None
- **Triggers**: None
- **Seed**:
  - Map Tap — `higher`, `score`, `daily`, resets `00:00`
  - Krillion — `higher`, `score`, `daily`, resets `00:00`
  - Size it Up — `higher`, `score`, `daily`, resets `00:00`
  - Wordle — `lower`, `guesses`, `weekly`, `min_entries` 4, `guess_cap` 6, resets `00:00`. The week runs Monday 00:00 to the next Monday 00:00 in the group timezone. `min_entries` stays on the row. The board no longer uses it as a gate. A longer range ranks a consistency-weighted average. A miss counts as 7 in that average.
  - Redactle — `lower`, `guesses`, `daily`, `guess_cap` null, resets `00:00`. Fewer guesses rank higher. A give-up keeps its guess count and ranks after every solve. A longer range averages solves only, then multiplies by the days since the game was turned on divided by the days filed, and by the days filed divided by the solves.
  - Time Guesser — `higher`, `score`, `daily`, resets `00:00`. The share total out of 50,000 is the score. Higher wins.
  - Semantle — `lower`, `guesses`, `daily`, no guess cap, resets `00:00`. Fewer guesses rank higher. A give-up keeps its guess count and ranks after every solve. #1 is 29 January 2022.
  - Farflung — `higher`, `score`, `daily`, resets `00:00`. The share total out of 500 km is the score. Higher wins. #1 is 5 October 2026.
  - Eraly — `higher`, `score`, `daily`, resets `00:00`. The share total out of 700 is the score. Higher wins. #1 is 16 October 2026.
  - Fermi — `lower`, `score`, `daily`, resets `00:00`. The score is the geometric mean of the three multiples, each capped at 1,000×. Lower wins. #1 is 27 July 2026.
  - Hivemind — `higher`, `score`, `daily`, resets `00:00`. The share total out of 1,000 is the score. Higher wins. #1 is 27 October 2026.
  - Noillirk — `higher`, `score`, `daily`, resets `00:00`. The score is the printed altitude in metres. Higher wins. Daily #1 is 27 September 2026. A Classic climb files on the upload day. Endless is not filed.
- **Last Modified**: 2026-11-19

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
  - active_on (DATE) — the day this game was first turned on in the group. Attempt shares start here, not on the group’s charter day. Turning the game off does not clear it.
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - group_games_pkey — (group_id, game_id)
- **Checks**: None
- **Foreign Keys**:
  - group_id → groups(group_id) ON DELETE CASCADE
  - game_id → games(game_id)
- **Triggers**: `group_games_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-11-09

### scores

- **Purpose**: One parsed result per player, game, and puzzle. A second paste of that puzzle is rejected. An older puzzle number backfills that day. `score` is the points total when the game’s `rank_basis` is `score`. `guesses` is the solve count when `rank_basis` is `guesses`. An unsolved Wordle stores neither number and `solved` is false. It still appears on a group board, as X/6 on a single day and inside the games-played count on a longer range. An unsolved Redactle stores its guess count, time, and hints.
- **Columns**:
  - score_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - puzzle_number (INTEGER NOT NULL) — Map Tap counts calendar days since 21 June 2024
  - raw_paste (TEXT NOT NULL)
  - snippet (TEXT NOT NULL) — the share grid shown on Home
  - image_url (TEXT) — picture from `POST /api/uploads`. Null when the score has none
  - score (NUMERIC(12, 2)) — null for guess games. Whole numbers for the points games. Fermi stores the printed multiple, such as 27.6 or 1.94.
  - guesses (INTEGER) — 1–6 when a Wordle is solved; the open count for Redactle, including a give-up; null for score games and unsolved Wordle
  - solved (BOOLEAN NOT NULL DEFAULT TRUE)
  - duration_seconds (INTEGER) — seconds spent. Null when the share does not report a time.
  - hints (INTEGER) — hints used. Null when the share does not report hints. Redactle sums every hint count on the line. `Hints: none` is 0.
  - played_on (DATE NOT NULL) — the day the puzzle was posted. Krillion #1 is 16 July 2026. Map Tap #0 is 21 June 2024. Wordle’s share number is days since 19 June 2021, so Wordle 1927 is 28 September 2026. Size It Up #1 is 10 August 2026, so #100 is 17 November 2026. A Magnitudle Size It Up card uses the printed date, and that date as YYYYMMDD is the puzzle number. Redactle #1 is 7 April 2022. Time Guesser #1 is 1 June 2023, so #1258 is 9 November 2026. Semantle #1 is 29 January 2022. Farflung #1 is 5 October 2026, so #44 is 17 November 2026. Eraly #1 is 16 October 2026, so #33 is 17 November 2026. Fermi #1 is 27 July 2026, so #115 is 18 November 2026. Hivemind #1 is 27 October 2026, so #24 is 19 November 2026. Noillirk daily #1 is 27 September 2026, so #54 is 19 November 2026. A Classic Noillirk climb uses the upload date, and that date as YYYYMMDD is the puzzle number. A Size It Up card that is the title, then `#N`, then `Score:` uses that puzzle number. #100 is 17 November 2026. Not the upload day.
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - scores_user_game_puzzle_uidx — unique (user_id, game_id, puzzle_number)
  - scores_game_puzzle_idx — Wordle board for one puzzle
  - scores_game_updated_idx — daily board by log time
  - scores_created_idx — home feed, newest first
- **Checks**:
  - `scores_puzzle_number_check` requires `puzzle_number >= 0`
  - `scores_score_check` requires a null or non-negative score
  - `scores_guesses_check` requires null or 1–9999
  - `scores_duration_check` requires null or a non-negative count of seconds
  - `scores_hints_check` requires null or a non-negative count
  - `scores_value_check` allows a score, a solved guess count, an unsolved row with both null, or an unsolved row that still has a guess count
- **Foreign Keys**:
  - user_id → users(user_id)
  - game_id → games(game_id)
- **Triggers**: `scores_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-11-18

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

### score_likes

- **Purpose**: One like per signed-in reader on a filed score. The home feed counts these rows.
- **Columns**:
  - score_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - score_likes_pkey — (score_id, user_id)
- **Checks**: None
- **Foreign Keys**:
  - score_id → scores(score_id) ON DELETE CASCADE
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-18

### score_comments

- **Purpose**: A short note on a filed score. The author can delete it. The post page lists these oldest first. A picture can stand in for the note.
- **Columns**:
  - comment_id (SERIAL PRIMARY KEY)
  - score_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL)
  - body (TEXT NOT NULL) — trimmed length up to 500. Empty only when `image_url` is set
  - image_url (TEXT) — picture from `POST /api/uploads`. Null when the comment has none
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - score_comments_score_created_idx — comments for one score, oldest first
- **Checks**:
  - `score_comments_body_check` requires a trimmed body of 1–500 characters, or an empty body when `image_url` is set
- **Foreign Keys**:
  - score_id → scores(score_id) ON DELETE CASCADE
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-18

### game_requests

- **Purpose**: A signed-in reader asks for a daily game the parsers do not recognize yet.
- **Columns**:
  - request_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - game_name (VARCHAR(80) NOT NULL)
  - note (TEXT)
  - seen (BOOLEAN NOT NULL DEFAULT FALSE) — false until an admin opens the request desk
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - game_requests_user_idx — requests by reader
- **Checks**: None
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-16

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

- **Purpose**: Text messages in one group and one game. Members only, and only after that member posts that game today. A `standings` row is the rankings note posted once when every current member has filed that game on the group's puzzle today. History is paged by `message_id`.
- **Columns**:
  - message_id (SERIAL PRIMARY KEY)
  - parlor_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - user_id (INTEGER NOT NULL) — the member whose post completed the board, including on a standings note
  - body (TEXT NOT NULL) — 1 to 2000 characters
  - kind (TEXT NOT NULL DEFAULT 'chat') — `chat` or `standings`
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - parlor_messages_game_idx — (parlor_id, game_id, message_id DESC)
- **Checks**: `parlor_messages_body_check` requires `char_length(body)` between 1 and 2000. `parlor_messages_kind_check` allows `chat` or `standings`
- **Foreign Keys**:
  - parlor_id → parlors(parlor_id) ON DELETE CASCADE
  - game_id → games(game_id)
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-04

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

- **Purpose**: One row per signed-in device. `token` is the APNs device token. `fcm_token` is the Firebase registration token used to send. Register both after sign-in. Delete that APNs token on sign-out.
- **Columns**:
  - device_token_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - token (TEXT NOT NULL UNIQUE) — APNs device token
  - fcm_token (TEXT NOT NULL UNIQUE) — FCM registration token
  - platform (VARCHAR(16) NOT NULL) — `ios`, `android`, or `web`
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - device_tokens_token_key — unique APNs token
  - device_tokens_fcm_token_key — unique FCM token
  - device_tokens_user_idx — tokens for one reader
- **Checks**: `device_tokens_platform_check` allows `ios`, `android`, or `web`
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: `device_tokens_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-09-30

### friendships

- **Purpose**: A friend request between two accounts. The global board can be limited to the caller and accepted friends. A pending request in the other direction is accepted. A declined pair can be requested again. Deleting the row cancels a request or ends a friendship.
- **Columns**:
  - friendship_id (SERIAL PRIMARY KEY)
  - requester_id (INTEGER NOT NULL)
  - addressee_id (INTEGER NOT NULL)
  - status (VARCHAR(16) NOT NULL DEFAULT 'pending') — `pending`, `accepted`, or `declined`
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
  - updated_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - friendships_pair_uidx — unique (requester_id, addressee_id)
  - friendships_addressee_idx — incoming requests
  - friendships_requester_idx — outgoing requests
- **Checks**:
  - `friendships_distinct` requires two different accounts
  - `friendships_status_check` allows `pending`, `accepted`, or `declined`
- **Foreign Keys**:
  - requester_id → users(user_id) ON DELETE CASCADE
  - addressee_id → users(user_id) ON DELETE CASCADE
- **Triggers**: `friendships_set_updated_at` via `set_updated_at()`
- **Last Modified**: 2026-11-16

### user_games

- **Purpose**: Games a reader has chosen to play. A missing row stays on, so the catalog stays visible until they turn a game off. Home, the Board filter, the reader’s own stats, and the story use this list.
- **Columns**:
  - user_id (INTEGER NOT NULL)
  - game_id (INTEGER NOT NULL)
  - enabled (BOOLEAN NOT NULL DEFAULT TRUE)
  - sort_order (INTEGER) — the reader’s order. Null keeps the catalog order
- **Indexes**:
  - user_games_pkey — (user_id, game_id)
  - user_games_user_idx — a reader’s selection
- **Checks**: None
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
  - game_id → games(game_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-19

### notifications

- **Purpose**: A like, a comment, or a friend request addressed to one account. Opening Notifications marks the rows read.
- **Columns**:
  - notification_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL) — the reader who receives it
  - actor_id (INTEGER) — the reader who liked, commented, or requested
  - kind (VARCHAR(16) NOT NULL) — `like`, `comment`, or `friend_request`
  - score_id (INTEGER) — the score for a like or a comment
  - friendship_id (INTEGER) — the request
  - read_at (TIMESTAMPTZ) — null until the list is opened
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - notifications_user_created_idx — a reader’s list, newest first
  - notifications_unread_idx — unread rows for one reader
- **Checks**: `notifications_kind_check` allows `like`, `comment`, or `friend_request`
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
  - actor_id → users(user_id) ON DELETE SET NULL
  - score_id → scores(score_id) ON DELETE CASCADE
  - friendship_id → friendships(friendship_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-19

### bug_reports

- **Purpose**: An error a reader sent from an unrecognized paste. Admins read them with game requests.
- **Columns**:
  - bug_report_id (SERIAL PRIMARY KEY)
  - user_id (INTEGER NOT NULL)
  - message (TEXT NOT NULL) — the error
  - detail (TEXT) — the paste
  - seen (BOOLEAN NOT NULL DEFAULT FALSE)
  - created_at (TIMESTAMPTZ NOT NULL DEFAULT NOW())
- **Indexes**:
  - bug_reports_user_idx — reports from one reader
- **Checks**: None
- **Foreign Keys**:
  - user_id → users(user_id) ON DELETE CASCADE
- **Triggers**: None
- **Last Modified**: 2026-11-19

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

### 013_device_fcm_token.sql

- Added `fcm_token` on `device_tokens`
- Removed rows that had only an APNs token
- **Last Modified**: 2026-09-30

### 019_night_mode.sql

- Added `night_mode` on `users`. On selects the ink edition
- **Last Modified**: 2026-11-13

### 016_account_notifications.sql

- Added `notifications` on `users`. Off skips every push, including the 8pm reminder
- **Last Modified**: 2026-11-04

### 015_parlor_message_kind.sql

- Added `kind` on `parlor_messages` (`chat` or `standings`)
- **Last Modified**: 2026-11-04

### 018_game_active_on.sql

- Added `active_on` on `group_games`. Enabled rows are backfilled from the last update, in the group timezone
- **Last Modified**: 2026-11-09

### 020_friendships.sql

- Created `friendships` for friend requests
- **Last Modified**: 2026-11-16

### 024_clear_policy_acceptance.sql

- Set `tos_accepted_version` and `privacy_accepted_version` to null on every account so the next sign-in accepts the current Terms and Privacy Policy
- **Last Modified**: 2026-11-16

### 023_admin.sql

- Added `is_admin` on `users` and set it for handle `will`
- Added `seen` on `game_requests`
- **Last Modified**: 2026-11-16

### 026_size_it_up_epoch.sql

- Recomputed `played_on` for numbered Size It Up scores. #1 is 10 August 2026, so #100 is 17 November 2026. A puzzle number stored as YYYYMMDD keeps its printed day
- **Last Modified**: 2026-11-17

### 032_reader_desk.sql

- Added `feed_scope` on `users`
- Added `sort_order` on `user_games`
- Created `notifications` and `bug_reports`
- **Last Modified**: 2026-11-19

### 031_noillirk.sql

- Added Noillirk to `games`. It is a daily score board, and higher wins. The score is the printed altitude in metres. Daily #1 is 27 September 2026
- Added a disabled `group_games` row for each existing group
- **Last Modified**: 2026-11-19

### 030_hivemind.sql

- Added Hivemind to `games`. It is a daily score board, and higher wins. The share total out of 1,000 is the score. #1 is 27 October 2026
- Added a disabled `group_games` row for each existing group
- **Last Modified**: 2026-11-19

### 029_fermi.sql

- Changed `scores.score` from integer to `NUMERIC(12, 2)` so a Fermi multiple such as 27.6 can be stored
- Added Fermi to `games`. It is a daily score board, and lower wins. #1 is 27 July 2026
- Added a disabled `group_games` row for each existing group
- **Last Modified**: 2026-11-18

### 025_farflung_and_eraly.sql

- Added Farflung and Eraly to `games`. Both are daily score boards, and higher wins. Farflung #1 is 5 October 2026. Eraly #1 is 16 October 2026
- Added a disabled `group_games` row for each existing group
- **Last Modified**: 2026-11-17

### 022_semantle.sql

- Added Semantle to `games`. Fewer guesses rank higher. A give-up ranks after solves. #1 is 29 January 2022
- **Last Modified**: 2026-11-16

### 021_user_games.sql

- Created `user_games` for the games a reader is playing
- **Last Modified**: 2026-11-16

### 017_time_guesser.sql

- Added Time Guesser to `games` and a disabled `group_games` row for each existing group
- **Last Modified**: 2026-11-09

### 014_redactle.sql

- Added Redactle to `games` and a disabled `group_games` row for each existing group
- Added `guess_cap` on `games`. Wordle is 6
- Added `duration_seconds` and `hints` on `scores`, and allowed an unsolved row to keep its guess count
- **Last Modified**: 2026-11-03

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
