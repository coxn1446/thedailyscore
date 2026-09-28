# The Daily Score — Architecture

Last Updated: 2026-09-28

Paste a daily-game result, parse it, and publish it to every group where that game is enabled. Members of a group can talk in that group’s parlor. The iOS app can receive a push for a new #1, a new member, a parlor message, and the 8pm reminder when the matching preference is on. Stripe UI stays unwired.

## Stack

React 19 (Vite 6) + Redux Toolkit 2 + Tailwind CSS 4 + Ionic React 8 + Capacitor 7, Express 5 + PostgreSQL (`pg` 8) + Passport sessions. Socket.io 4 joins `group:{id}` after identify. Firebase Admin sends FCM. Stripe 18 is installed and unwired. Versions live in `package.json`.

## Features

- **Sign-in**: Email or handle plus password. Google and Apple when credentials are set. New OAuth accounts choose a unique handle before chrome.
- **Register**: Display name, unique lowercase handle, email, password, and the client timezone.
- **Desks**: Home is the paste desk. Groups is the directory and the selected register. Profile is Stats, then the reader’s details.
- **Scores**: Home takes a raw paste. The headline is “What did you play today?” The textarea placeholder is “copy and paste your score from any daily game here.” On a phone, Submit is a full-width bar. On a wide screen the desk is centered in the pane. There is no kicker and no deck under it. Preview names the game, puzzle number, score or guesses, share snippet, and every non-archived group where the caller is a member and that game is enabled. The reader checks which of those groups receive it. Select All checks every group. Deselect All clears them when every group is already checked. Confirm stores the paste. Checked groups get publication rows. An empty checklist still saves the personal score and writes no publications. An unrecognized paste returns an error and writes nothing; the desk links to a request for that game. A second paste of a puzzle the reader already filed is rejected. An older puzzle in the same paste desk backfills that day. Map Tap, Krillion, and Size it Up store a score. Wordle stores guesses and does not invent a points score. An unsolved Wordle is saved and left out of the rank. `played_on` is the day that puzzle was posted: Krillion #1 is 16 July 2026, Map Tap #0 is 21 June 2024, Wordle 1 is 19 June 2021, and Size It Up #1 is 4 September 2026. A Size It Up paste with no puzzle number uses the upload date in the reader’s timezone as the puzzle id. The day ends at `resets_at` (midnight) in the group timezone. A week starts Monday 00:00 in the group timezone. The register lists each score. The directory ranks a score game’s week and custom range by total points and also shows the average, and ranks all time by best score with the average beside it. Wordle’s directory week is the average of solved puzzles, and a player needs four. A custom range filters `played_on`. Rank is inside each destination group on that game’s board. A parser is one module per slug, registered in `server/parsers`. Adding a game is a catalog row plus one parser file.
- **Gazette**: The read API remains. Home does not show the feed.
- **Masthead**: Signed-in chrome is the edition line. On a wide screen the text nav sits under it. The wordmark and portrait are not in that bar. `GET /api/scores/logged-today` still counts the caller’s results since midnight in their timezone.
- **Game catalog**: Map Tap, Krillion, Size it Up, and Wordle. A new game is a catalog row (`slug`, `rank_basis`, `board`, `sort_direction`, `min_entries`, `resets_at`). Map Tap, Krillion, and Size it Up are daily score boards: highest score wins, and the day resets at midnight in the group timezone. Wordle has no points score. Its board is a weekly average of guesses, and a player needs four solved puzzles that week to be ranked. Each game has its own scoreboard.
- **Groups**: A signed-in reader can charter a group (name, tagline, creator timezone, invite token), pick which catalog games start enabled, add existing handles, and join from `/join/:token`. Membership is `curator` or `fellow`. Curators rename the group, toggle games, archive, and copy an invite link from Roster. Governance does not add members by handle. Fellows leave. The last curator cannot leave. Archived groups leave the directory and reject new joins. A curator restores an archived group from Profile. Turning a game off updates `group_games.enabled` and does not delete the row. The game filter and time period are route state (`?game=`, `?period=` of `today`, `week`, `all`, or `custom`, plus `from` and `to`). On a phone those filters stack: games, then the period, then the custom dates. Switching groups keeps both. They are not stored on the group. Create a Group opens a dialog on a phone. The switcher lists games enabled in at least one of the caller’s groups. Turning a game off removes it from that list when no remaining group plays it. With no `?game=`, the route opens the game the reader already has a rank in, otherwise the group's first enabled game. The directory lists only groups that have the selected game enabled. Each card’s rank is the caller’s rank for the selected period, alone on the right, the full height of the card, and its count is scores posted today. The open register lists every individual score in the period, ordered by that score. The same player can appear more than once. The name line uses the puzzle’s posted day. The directory row is the caller’s standing: Today is Score and Rank; Week and Custom are Total Points, Average, and Rank, ordered by the total; All time is Best, Average, and Rank, ordered by the best score. Those directory numbers share one size under column headers. Wordle’s directory week stays an average of guesses and omits a rank under `min_entries`. An enabled game with no posts shows that game’s empty board. Non-members receive 403.
- **Parlor**: One parlor per group, split into one conversation per enabled game. A conversation stays hidden until the reader posts that game on the current date in their timezone. Messages lists each unlocked conversation in columns for the group, the game, and the latest message. On a phone a chat icon beside Settings opens one modal for that group, and the reader flips between its enabled games there. Opening a Messages row uses the same modal. A game not posted today tells the reader to submit a score on Home. On a wide screen the open game is the third column. Unread is per conversation. Opening it marks that game read. Text only, members only. History pages newest-last. A smiley sits immediately to the right of each message. A post is stored and emitted on Socket.io room `group:{id}:game:{gameId}` as `parlor:message`. A member who posted that game today, has messages alerts on, and has no active socket gets a push. The author does not.
- **Push**: After sign-in the iOS app registers its Capacitor token at `POST /api/devices` and deletes that token on sign-out. FCM goes through Firebase Admin. A crown push fires when a post takes rank 1 on that game’s board only: today’s highest score, or the weekly guess average once the player has `min_entries`. A combined scoreboard is not crowned. Readers with `alert_crown` off are skipped, and the person who posted is skipped. Copy names the event. It does not include the paste or a solution word. A new member notifies other members with `alert_new_member`, not the actor and not the new member. `POST /api/internal/reminders` sends “File today's score.” to users with `remind_daily` who have no score posted on the current date in their timezone and whose local hour is 20. Cloud Scheduler calls that route. This app does not run a cron.
- **Profile**: Stats is the first tab: the best mark in each catalog game, with the date it was attained, and one block per game played. A score game’s best is the highest score. Wordle’s best is the fewest guesses on a solved puzzle, shown as guesses, not points. Ties use the earliest attainment. Score games show games played and average score. Guess games show solved count and average guesses. The Profile tab edits display name, handle, email, and a round portrait from `POST /api/uploads`. Save appears only after a change. Handle stays unique. Curators unarchive groups there. Export CSV, Sign Out, and Delete Profile are the same size and centered on that tab. Delete account asks in a branded dialog, then removes that reader’s memberships, publications, and scores. A group they chartered is handed to another member when one remains, and removed when they were the only member. The account row is then gone, so sign-in fails.
- **Game requests**: An unrecognized paste offers a request form. A signed-in reader files a game name and an optional note. Rows live in `game_requests`. Nothing else reads them yet.
- **Realtime**: Socket.io `identify` joins each unlocked `group:{id}:game:{gameId}` room. Posting today’s score joins those rooms. Parlor posts emit `parlor:message` to that room. Disconnect drops the socket. A member with no socket is the one who can receive a parlor push.

## API Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Process and database status |
| GET | `/api/auth/config` | Public | Whether Google and Apple buttons should render |
| POST | `/api/auth/register` | Public | Create a local account and start a session |
| POST | `/api/auth/login` | Public | Session from email or handle and password |
| POST | `/api/auth/logout` | Session | End the session |
| GET | `/api/auth/me` | Session | Current user |
| GET | `/api/auth/google` | Public | Start Google OAuth |
| GET | `/api/auth/google/callback` | Public | Finish Google OAuth |
| POST | `/api/auth/google/callback` | Public | Google One Tap / GIS callback |
| GET | `/api/auth/apple` | Public | Start Apple Sign In |
| POST | `/api/auth/apple/callback` | Public | Finish Apple Sign In |
| POST | `/api/auth/native-session-handoff` | Public | Exchange a native OAuth handoff token for a session |
| POST | `/api/auth/forgot-password` | Public | Send a reset link when the email exists |
| POST | `/api/auth/reset-password` | Public | Set a new password from a reset token |
| POST | `/api/auth/verify-email` | Public | Confirm an email token |
| POST | `/api/auth/verify-email/resend` | Session | Send another confirmation link |
| POST | `/api/users/handle` | Session | Claim a unique handle before chrome |
| POST | `/api/uploads` | Session | Store a file and return its URL. Portraits use this route |
| GET | `/api/profile` | Session | Caller’s identity and per-game stats. Another user’s id is 403 |
| PATCH | `/api/profile` | Session | Update the caller’s identity, dispatch, and reminder flags |
| GET | `/api/profile/export` | Session | CSV of the caller’s scores |
| DELETE | `/api/profile` | Session | Delete the account, memberships, publications, and scores |
| GET | `/api/groups` | Session | Directory of the caller’s groups, today’s counts, glance ranks, and the game catalog |
| POST | `/api/groups` | Session | Charter a group; caller becomes curator |
| GET | `/api/groups/:groupId` | Session, member | Group, game matrix, roster, and the `?game=` board. Non-members receive 403 |
| GET | `/api/groups/:groupId/days` | Session, member | One earlier day of `?game=` at `?offset=`. Offset 0 is the current score day. An enabled game with no posts returns an empty list |
| PATCH | `/api/groups/:groupId/games` | Session, curator | Turn games on or off without deleting rows |
| PATCH | `/api/groups/:groupId` | Session, curator | Rename the group |
| POST | `/api/groups/:groupId/archive` | Session, curator | Archive the group |
| POST | `/api/groups/:groupId/unarchive` | Session, curator | Restore an archived group |
| GET | `/api/groups/archived` | Session | Archived groups the caller curates |
| POST | `/api/groups/:groupId/leave` | Session, member | Leave. Last curator receives 403 |
| POST | `/api/groups/:groupId/members` | Session, curator | Add an existing user by exact handle |
| POST | `/api/groups/join/:token` | Session | Join as a fellow. Repeat joins do not duplicate membership |
| GET | `/api/scores/bests` | Session | The caller’s best mark in each catalog game. Unaffected by a group turning a game off |
| GET | `/api/scores/logged-today` | Session | Count of the caller’s results since midnight in their timezone |
| GET | `/api/scores/gazette` | Session | Today’s publications into the caller’s groups, one card per result, newest first |
| POST | `/api/scores/preview` | Session | Recognize a paste and list destination groups. Writes nothing |
| GET | `/api/scores/archive` | Session | The caller’s filed scores and the groups each one is shared with |
| DELETE | `/api/scores/:scoreId` | Session | Delete one of the caller’s scores. Another reader’s score is 404 |
| PATCH | `/api/scores/:scoreId/groups` | Session | Replace the groups that received one of the caller’s scores |
| POST | `/api/scores` | Session | Store the paste. `groups` lists who receives it. An empty list saves only the personal score. A puzzle the caller already filed returns 409 |
| POST | `/api/game-requests` | Session | File a request for a game the parsers do not recognize |
| GET | `/api/groups/conversations` | Session | Unlocked group-and-game conversations for games posted today |
| GET | `/api/groups/:groupId/parlor/messages` | Session, member, posted today | Parlor history for `game`. `before` is a message id. Hidden games and non-members receive 403 |
| POST | `/api/groups/:groupId/parlor/messages` | Session, member, posted today | Store a text message for `game` and emit it to `group:{id}:game:{gameId}` |
| POST | `/api/groups/:groupId/parlor/read` | Session, member, posted today | Mark that game’s conversation read through the latest message |
| POST | `/api/devices` | Session | Store the Capacitor push token for this account |
| DELETE | `/api/devices` | Session | Remove the caller’s token on sign-out |
| POST | `/api/internal/reminders` | `X-Cron-Secret` or `Authorization: Bearer` matching `CRON_SECRET` | 8pm reminder. When `CRON_SECRET` is unset, development allows the call and every other environment returns 401 |

Unrecognized paste returns `400` with `Unrecognized result` and writes nothing. An empty paste returns `400` with `Paste a result`.

Unknown handle returns `404` with `Unknown handle`. Already a member returns `409` with `Already a member`. Archived joins return `403` with `Archived groups are not accepting members`.

Duplicate handle returns `409` with `Handle already in use`. A taken email on profile returns `409` with `Email already in use`. Another user’s profile id returns `403` with `Not your profile`. A repeated puzzle returns `409` with `you've already uploaded this score`.

## Client

`NativeProvider` → router → `ContentArea`. Signed-in readers with a handle see `Masthead`, the desk, the colophon, and the mobile tab bar. Guests hitting `/` go to `/login`. Google and Apple users without `handle` stay on `/register`.

`SocketWatcher` connects after sign-in and emits `identify` with `user_id`. `PushWatcher` registers the Capacitor push token after sign-in on a native build. Sign-out deletes that token before the session ends.

### Cloud Scheduler

Create the job in GCP. Do not add a scheduler dependency to this app.

| | |
| --- | --- |
| Method | `POST` |
| URL | `https://<service-host>/api/internal/reminders` |
| Schedule | `0 * * * *` (every hour, minute 0) |
| Time zone | `Etc/UTC` |
| Header | `X-Cron-Secret: <CRON_SECRET>` |

The route sends only to readers whose local hour is 20, so each timezone receives the reminder at 8pm. It skips `remind_daily` off and anyone who already posted a score on today’s date in their timezone.

## Database

Local Postgres database: `thedailyscore`.

Shared Cloud SQL (not created by this shell):

| | |
| --- | --- |
| Project | `nash-data` |
| Instance | `shared-pg` |
| Connection name | `nash-data:northamerica-northeast1:shared-pg` |
| Database | `thedailyscore` |
| Schemas | `qa`, `prod` |

Runtime user is `postgres`. App Engine / Cloud Run keeps its own project and attaches the instance with `INSTANCE_CONNECTION_NAME`. Set `DB_SCHEMA` to `qa` or `prod` so the pool `search_path` matches. Do not point production at `public`.

## Native

| Flavor | Bundle id | Display name |
| --- | --- | --- |
| dev | `co.thedailyscore.thedailyscore.dev` | The Daily Score Dev |
| qa | `co.thedailyscore.thedailyscore.qa` | The Daily Score QA |
| prod | `co.thedailyscore.thedailyscore.prod` | The Daily Score |

Splash and status bar use paper `#FBF9F5`. Status bar text is ink `#111111` (`Style.Light`). Keyboard resize is `none`. The iOS URL scheme is `Thedailyscore`. There is no camera plugin and no photo-library usage string.

`npm run s` syncs the dev flavor.

## Deployment

Cloud SQL database creation, Firebase APNs, and the deploy pipeline are later work. The Cloud Scheduler job above is also created in GCP, not by this repo. Secrets in QA and production load from Secret Manager when `NODE_ENV` is `qa` or `production`. Set `CRON_SECRET` and `FIREBASE_SERVICE_ACCOUNT_JSON` there.
