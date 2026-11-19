# The Daily Score — Architecture

Last Updated: 2026-11-19

Paste a daily-game result, parse it, and file it on the global leaderboard. A reader can switch that board to accepted friends. The iOS app can receive a push for a like, a comment, a friend request, an accepted request, and the 8pm reminder when the matching preference is on. Group and parlor tables remain in the database and are not linked from the product. Stripe UI stays unwired.

## Stack

React 19 (Vite 6) + Redux Toolkit 2 + Tailwind CSS 4 + Ionic React 8 + Capacitor 7, Express 5 + PostgreSQL (`pg` 8) + Passport sessions. Socket.io 4 joins `group:{id}` after identify. Firebase Admin sends FCM. Stripe 18 is installed and unwired. Versions live in `package.json`.

## Features

- **Sign-in**: Email or handle plus password. Forgot password shows the toast “Reach Out to Will.” Google and Apple, when credentials are set, sit under that control and above the create-account link. Terms of Service, Privacy, Account Deletion, and Support sit under that link. Account Deletion at `/account-deletion` is public and explains in-app deletion and an email request. Terms, Privacy, Account Deletion, and Support pin Back at the top of the page. Support asks the reader to email williamwildernash@gmail.com. New OAuth accounts choose a unique handle before chrome. A reader whose accepted Terms or Privacy version is missing sees a centered dialog over the desk. It says the policies changed on November 16, 2026, and the desk stays in place until they agree.
- **Register**: The wordmark is omitted. Display name, unique lowercase handle, email, password, and the client timezone. Continue with Google and Continue with Apple sit under Create account and above Already registered.
- **Desks**: Home is the paste desk and the score feed. Board is the global leaderboard, with a Friends scope. Profile is Stats, then the reader’s details. Admins also see Admin. `/groups`, `/messages`, and `/join/:token` redirect to `/board`.
- **Scores**: Home takes a raw paste. The headline is “What did you play today?” The textarea placeholder is “copy and paste your score from any daily game here.” Submit sits at the end of that row inside the paste box. Copy Today's Score is the copy icon. Share to Instagram is the Instagram icon and stays on the iOS app. On a wide screen the desk is centered in the pane. There is no kicker and no deck under it. A Games control, a plus icon, sits in that row and opens a menu above the feed of Map Tap, Krillion, Size it Up, Wordle, Redactle, Time Guesser, Semantle, Farflung, Eraly, Fermi, Hivemind, and Noillirk, each with its logo from `src/assets/gamelogos` when one is there, and each link opens that game. Preview names the game, puzzle number, score or guesses, and the share snippet. Post and Edit confirm the paste. Post sits at the end of that row, where Submit sat. There is no group checklist. Confirm stores the score. The client sends an empty group list, so no publication rows are written. A successful post clears the paste field. Today’s global rank is a toast. Share to Instagram stays on the paste row. The toast reads Best all time. when the row beats every other score in that game, Best this week. when it only beats the current Monday–Sunday in the reader’s timezone, and Saved otherwise. A tie is not a best. An unsolved guess game is not a best. The global board reads `scores`, including a score that was never published to a group. An unrecognized paste returns an error and writes nothing; the desk links to a request for that game. A second paste of a puzzle the reader already filed is rejected. An older puzzle in the same paste desk backfills that day. Map Tap, Krillion, and Size it Up store a score. Wordle stores guesses and does not invent a points score. An unsolved Wordle is saved with no guess count and shown as X/6. A miss counts as 7 when a range is averaged. Redactle stores the guess count, the seconds spent, and the hints used. Semantle stores the guess count and the hints used, and does not store a time. Fewer guesses rank higher. A give-up keeps that count and ranks after every solve. Semantle #1 is 29 January 2022. A give-up keeps that guess count and ranks after every solve. The best Redactle is the solved puzzle with the fewest guesses. Averages of guesses, time, and hints use solves only. A give-up is counted on Profile and on the longer board, and it lowers the solved share. Today, and a Custom range of one day, lists each Wordle. A longer range lists one row per player with best solve, average, and games played. That rank is the average times a consistency multiplier: under 25% of the possible days multiplies by 2, from 25% up to 50% by 1.5, from 50% through 75% by 1.25, and above 75% by 1. Possible days in a week or custom range run through today in the reader’s timezone. All-time possible days run from that game’s first puzzle date through the reader’s today. A week counts Monday through today. Copy Today's Score, under Submit, copies every result filed since midnight in the reader’s timezone. The first line is “The Daily Score” and the date. Each game is its name, then the score. Wordle is only the guess line. Krillion puts the tier emoji ahead of the score. Map Tap puts the round emoji and scores ahead of the total. Time Guesser puts the five rounds ahead of the total. Farflung puts the rarity line ahead of the kilometres. Eraly puts the journey bar and the squares ahead of the points. Fermi puts the three estimates ahead of the multiple. Hivemind puts the round marks and the rank ahead of the honey total. Noillirk puts the altitude band and the seven squares ahead of the metres. The last line is the site address with a period on each side, and any other address in the copy is wrapped the same way, so Messages shows a text link instead of a preview. The public page sets an Open Graph title and the line “Check out the daily score to keep track of all your daily challenge games,” and does not set a preview image. `played_on` is the day that puzzle was posted: Krillion #1 is 16 July 2026, Map Tap #0 is 21 June 2024, Wordle’s share number is days since 19 June 2021, so Wordle 1927 is 28 September 2026. Size It Up #1 is 10 August 2026, so #100 is 17 November 2026. Redactle #1 is 7 April 2022. Time Guesser #1 is 1 June 2023, so #1258 is 9 November 2026. Farflung #1 is 5 October 2026, so #44 is 17 November 2026. Eraly #1 is 16 October 2026, so #33 is 17 November 2026. Fermi #1 is 27 July 2026, so #115 is 18 November 2026. Hivemind #1 is 27 October 2026, so #24 is 19 November 2026. Noillirk daily #1 is 27 September 2026, so #54 is 19 November 2026. A Classic climb has no shared puzzle and files on the upload day. An Endless climb is not filed. The share total, out of 50,000, is the score. Farflung’s share total, out of 500 km, is the score. Eraly’s share total, out of 700, is the score. Hivemind’s share total, out of 1,000, is the score. Noillirk’s score is the printed altitude in metres. Higher wins. Fermi’s score is the geometric mean of the three multiples. Each multiple is capped at 1,000×, and the mean is capped there too. 1× is perfect. Lower wins. A Size It Up paste with no puzzle number uses the upload date in the reader’s timezone as the puzzle id. The Magnitudle card (“Magnitudle — Size It Up”, a printed date, and “Score: 212/500”) uses that printed date, and the score is the points before the slash. A Size It Up card that is the title, then a line “#100”, then “Score: 96/500”, uses that puzzle number. #100 is 17 November 2026. The day ends at midnight in the reader’s timezone. A week starts Monday 00:00 in the reader’s timezone. The register lists each score. Week and custom ranges for a score game rank by total points and also show the average. All time is average score times the percent of distinct days since that game’s first puzzle, capped at 100%. The board shows Average, Multiplier, and All time. Wordle’s week is the average of solved puzzles. A custom range filters `played_on`. Rank is on the global board for that game. A parser is one module per slug, registered in `server/parsers`. Adding a game is a catalog row plus one parser file.
- **Gazette**: The read API remains. Home shows the score feed, not the gazette.
- **Feed**: Home lists the latest 40 scores, newest first. The player’s name sits at the top left of a card and the game sits at the top right. Like and comment are icons. A like fills and the count changes before the server answers, and a failed like returns to the previous count. Each card shows how long ago the score was filed. On the iOS app, pulling down from the top of Home reloads the feed. Opening a card goes to `/post/:scoreId`, where the comments are already listed. Back returns to the same place in the feed. The game name links to that game, and its logo sits to the right of the name. A comment can include a picture from `POST /api/uploads`. The chosen file shows in the comment box before it is posted. While that file uploads, a bar shows how far it has gone. Tapping a picture opens it full screen. On a phone, a pinch zooms it and a drag moves it. The comment’s author can delete it. A suspended reader’s scores stay off the feed. A new like and a new comment each notify the post’s author.
- **Masthead**: Signed-in chrome is the edition line. On a wide screen the text nav sits under it. The wordmark and portrait are not in that bar. `GET /api/scores/logged-today` still counts the caller’s results since midnight in their timezone.
- **Game catalog**: Map Tap, Krillion, Size it Up, Wordle, Redactle, Time Guesser, Semantle, Farflung, Eraly, Fermi, Hivemind, and Noillirk. A new game is a catalog row (`slug`, `rank_basis`, `board`, `sort_direction`, `min_entries`, `guess_cap`, `resets_at`). Map Tap, Krillion, Size it Up, Time Guesser, Farflung, Eraly, Hivemind, and Noillirk are daily score boards: highest score wins, and the day resets at midnight in the reader’s timezone. Fermi is a daily score board where the lower multiple wins. A week and all time rank the average multiple times the consistency bands, so a skipped day does not improve the rank. Wordle has no points score. `guess_cap` is 6, a single day shows the guess line, including X/6, and a longer range ranks the consistency-weighted average and shows best, average, and games played. Redactle has no guess cap. Semantle has no guess cap and no duration, and it ranks the same way. Fewer guesses rank higher. A longer range averages solved puzzles only. The week multiplies by the raw attempt share and solve share. All time puts each share in a 25-point band: 90% or better adds nothing, 75% up to 90% adds 25, and each quarter below that adds another 25, stopping at 200%. The days for an all-time share start at that game’s first puzzle date. A give-up is not a solve. The question mark shows that player’s average, attempt percentage, and solve percentage. Each game has its own scoreboard.
- **Board**: One leaderboard for every filed score. The game filter, time period, and board stay on the route (`?game=`, `?period=` of `today`, `week`, `all`, or `custom`, plus `from` and `to`, and `?view=` of `scores` or `board`). `?scope=` is `global` or `friends`. On a phone the filters stack: games, then the period, then the custom dates. The games stay on one scrolling line for every period. Today and this week use the reader’s timezone on `played_on`. All-time possible days run from that game’s first puzzle date in `server/parsers/puzzleDate.js` through the reader’s today, the same window for every player. Week and custom ranges stay Monday-through-today and the chosen dates. Friends scope is the caller plus accepted friends. The reader’s rank sits above the list. Week and All time keep Scores and Leaderboard. Score games rank a week by total points. Fermi’s week and all time rank the average multiple times the consistency bands, and a lower result wins. All time for the other score games is average times the consistency multiplier. That multiplier sits in the question mark, and the board has no multiplier column. Wordle keeps the week bands. Redactle keeps the attempt and solve shares. Logos from `src/assets/gamelogos` sit on the game filter.
- **Friends**: Exact-handle requests from another reader’s profile or the Friendship requests tab. Sent Requests and Inbox head that tab. A request the other way accepts the pair. Decline can be requested again. Cancel and unfriend delete the row. Unknown handle is 404. Yourself, a duplicate pending request, and an existing friendship are 409. Accept and decline are only for the addressee. Profile’s Friendship requests tab lists incoming, outgoing, and accepted friends. The incoming count is a badge on that tab and on the Profile nav item. A request and an accept each send one push, skipped when account notifications are off.
- **Stories**: On the iOS app, Share to Instagram sits beside Copy Today’s Score. It stays hidden on the web and on Android. It opens a dialog for Today or This week, then Paper, Ink, or Carmine, and the share button is inside that dialog. The card is the masthead, the edition date, one block per filed game the reader still plays, with its logo and score line, a Rank header over the rank column when a rank is present, and `thedailyscore.site`. The PNG is 1080 by 1920. On iOS, Share places that PNG on the pasteboard as the story background and opens `instagram-stories://share`. The address on the card is type. That handoff needs Instagram installed and a numeric `FacebookAppID` in the iOS app (`FACEBOOK_APP_ID` is written into the plist by `npm run s`). The system share sheet is used when that handoff is not in the installed build, and the PNG downloads as `the-daily-score.png` when the sheet cannot take a file.
- **Games you play**: On a phone the gear sits on the edition line with no border. On a wide screen it sits at the top of Home, with its border. Select Your Games in Profile Settings toggles the same catalog. A missing `user_games` row stays on. Home draws its game menu only after that list is known, and keeps the last list for the visit, so a game that is off does not flash on. A game that is off leaves Home, the Board filter, the reader’s stats, and the story. Other players’ profiles still show the games they have filed.
- **Profiles**: `/profile/:handle` shows another reader’s name, portrait, stats, and Follow. Names on the board link there. Follow stays on that profile. Profile Stats draws one line per game the reader still plays. The legend is one scrolling line and toggles a line off. Dates run across the chart. Each game is scaled from its own lowest score at the baseline to its highest score at the top. Hovering or focusing a point names that game, date, score, and puzzle.
- **Groups and parlor**: Tables, routes, and server modules remain. They are not linked in the product. `/groups`, `/messages`, and `/join/:token` redirect to `/board`.
- **Push**: After sign-in the iOS app registers the APNs device token and the FCM registration token at `POST /api/devices`, and deletes that APNs token on sign-out. Sends use the FCM token through Firebase Admin. A like notifies the post’s author. Liking again, unliking, and liking your own post do not send one. A comment notifies the post’s author. Commenting on your own post does not send one, and the push does not include the comment. A friend request and an accept notify the other person when account notifications are on. Copy names the event. It does not include the paste or a solution word. A new member notifies other members with `alert_new_member`, not the actor and not the new member. `POST /api/internal/reminders` sends “File today's score.” to users with `remind_daily` who have no score posted on the current date in their timezone and whose local hour is 20. Cloud Scheduler calls that route. This app does not run a cron.
- **Profile**: Stats is the first tab: the best mark in each catalog game, with the date it was attained, and one block per game played. Posting a score reloads the profile graph, those marks, and the board. A score game’s best is the highest score. Wordle’s best is the fewest guesses on a solved puzzle, shown as guesses, not points. Ties use the earliest attainment. Score games show games played and average score. Wordle shows solved count and average guesses as n/6. Redactle’s best is the fewest guesses on a solve, shown as a count, and that row also averages time and hints. The Profile tab edits display name, handle, email, and a round portrait from `POST /api/uploads`. Choosing a file stores that portrait, and a bar shows how far the upload has gone. Save appears only after a name, handle, or email change. Handle stays unique. The game archive lists each filed score and can delete it. It does not edit group sharing. Settings opens a dialog on the Profile tab with the account Notifications switch, the Night mode switch, Export CSV, and Delete Profile. Night mode is saved on the account and restores the ink edition on the next visit. Sign Out stays on the page. Notifications off skips every push for that account. On the native app, turning it on asks for permission again only while the system will still show the prompt, then registers the device. It does not open iOS Settings. Export CSV, Sign Out, and Delete Profile are the same size and centered on that tab. `https://thedailyscore.site/.well-known/apple-app-site-association` lets iOS open the installed app for site links. The association lists the prod, QA, and dev bundle ids. `/api`, `/.well-known`, and `/uploads` stay in the browser. Terms of Service, Privacy, Account Deletion, and Support sit under those buttons. Delete account asks in a branded dialog, then removes that reader’s memberships, publications, and scores. A group they chartered is handed to another member when one remains, and removed when they were the only member. The account row is then gone. Sign-in opens with Account deleted, and that sign-in does not send the reader back to Profile.
- **Game requests**: An unrecognized paste offers a request form. A signed-in reader files a game name and an optional note. Rows live in `game_requests`. Admins open them at `/admin`. A request stays unseen until that desk is opened, and the unseen count badges Admin in the nav. Handle `will` is an admin.
- **Realtime**: Socket.io `identify` joins each unlocked `group:{id}:game:{gameId}` room. Posting today’s score joins those rooms. Parlor posts emit `parlor:message` to that room. Disconnect drops the socket. A member with no socket is the one who can receive a parlor push.

## API Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Process and database status |
| GET | `/api/auth/config` | Public | Whether Google and Apple buttons should render |
| POST | `/api/auth/register` | Public | Create a local account and start a session |
| POST | `/api/auth/login` | Public | Session from email or handle and password |
| POST | `/api/auth/policies` | Session | Record acceptance of the current Terms and Privacy Policy |
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
| POST | `/api/uploads` | Session | Store a file and return its URL. Portraits and comment pictures use this route |
| GET | `/api/profile` | Session | Caller’s identity and per-game stats. Another user’s id is 403 |
| PATCH | `/api/profile` | Session | Update the caller’s identity, notifications, night mode, and reminder flags |
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
| GET | `/api/scores/today` | Session | Those same results, for Copy Today's Score |
| GET | `/api/scores/gazette` | Session | Today’s publications into the caller’s groups, one card per result, newest first |
| POST | `/api/scores/preview` | Session | Recognize a paste. Writes nothing |
| GET | `/api/scores/archive` | Session | The caller’s filed scores and the groups each one is shared with |
| DELETE | `/api/scores/:scoreId` | Session | Delete one of the caller’s scores. Another reader’s score is 404 |
| PATCH | `/api/scores/:scoreId/groups` | Session | Replace the groups that received one of the caller’s scores |
| POST | `/api/scores` | Session | Store the paste. `groups` lists who receives a publication. The client sends an empty list. Optional `image_url` is a picture from `POST /api/uploads`. The score is on the global board either way. The body includes `personal.best_week`, `personal.best_all`, and `global_rank` for today. A puzzle the caller already filed returns 409 |
| GET | `/api/feed` | Session | The latest 40 scores, newest first, with like and comment counts |
| GET | `/api/feed/:scoreId` | Session | One score for `/post/:scoreId` |
| POST | `/api/feed/:scoreId/like` | Session | Like a score. A second like stays one like |
| DELETE | `/api/feed/:scoreId/like` | Session | Remove the caller’s like |
| GET | `/api/feed/:scoreId/comments` | Session | Comments on a score, oldest first |
| POST | `/api/feed/:scoreId/comments` | Session | Add a comment. Optional `image_url` is a picture from an upload. Empty, with no picture, is 400. Longer than 500 characters is 400 |
| DELETE | `/api/feed/comments/:commentId` | Session, author | Delete the caller’s comment |
| PATCH | `/api/feed/:scoreId/image` | Session, owner | Set or clear `image_url` on the caller’s score |
| GET | `/api/scores/recap` | Session | The caller’s today or week lines for a story. `period` is `today` or `week` |
| GET | `/api/profile/games` | Session | Catalog games and whether the caller is playing each one |
| PUT | `/api/profile/games` | Session | Replace the caller’s game selection. `games` is the slugs that stay on |
| GET | `/api/profile/player/:handle` | Session | Another reader’s public name, portrait, stats, and friendship |
| GET | `/api/board` | Session | Global or friends leaderboard. `scope` is `global` or `friends`. `game`, `from`, and `to` select the register. Games the caller turned off are omitted |
| GET | `/api/friends/search` | Session | Handles that start with `q`, each with the caller’s friendship status |
| POST | `/api/friends` | Session | Request the exact handle. The other direction of a pending request accepts it |
| POST | `/api/friends/:friendshipId/accept` | Session, addressee | Accept a pending request |
| POST | `/api/friends/:friendshipId/decline` | Session, addressee | Decline a pending request |
| DELETE | `/api/friends/:friendshipId` | Session, either party | Cancel a request or unfriend |
| POST | `/api/game-requests` | Session | File a request for a game the parsers do not recognize |
| GET | `/api/admin/requests` | Session, admin | Game requests, newest first, with the submitter. Anyone else receives 403 |
| GET | `/api/admin/requests/unseen` | Session, admin | Count of requests that have not been opened |
| POST | `/api/admin/requests/seen` | Session, admin | Mark every unseen request seen |
| GET | `/api/groups/conversations` | Session | Unlocked group-and-game conversations for games posted today, each with up to three recent chatter portraits |
| GET | `/api/groups/:groupId/parlor/messages` | Session, member, posted today | Parlor history for `game`. `before` is a message id. Hidden games and non-members receive 403 |
| POST | `/api/groups/:groupId/parlor/messages` | Session, member, posted today | Store a text message for `game` and emit it to `group:{id}:game:{gameId}` |
| POST | `/api/groups/:groupId/parlor/read` | Session, member, posted today | Mark that game’s conversation read through the latest message |
| POST | `/api/devices` | Session | Store the caller’s APNs token and FCM token |
| DELETE | `/api/devices` | Session | Remove the caller’s APNs token on sign-out |
| POST | `/api/internal/reminders` | `X-Cron-Secret` or `Authorization: Bearer` matching `CRON_SECRET` | 8pm reminder. When `CRON_SECRET` is unset, development allows the call and every other environment returns 401 |

Unrecognized paste returns `400` with `Unrecognized result` and writes nothing. An empty paste returns `400` with `Paste a result`.

Unknown handle returns `404` with `Unknown handle`. Already a member returns `409` with `Already a member`. Archived joins return `403` with `Archived groups are not accepting members`.

Duplicate handle returns `409` with `Handle already in use`. A taken email on profile returns `409` with `Email already in use`. Another user’s profile id returns `403` with `Not your profile`. A repeated puzzle returns `409` with `you've already uploaded this score`. A missing score returns `404` with `Score not found`. Deleting someone else’s comment returns `403` with `Not your comment`. A picture on someone else’s score returns `403` with `Not your score`. An empty comment returns `400` with `Comment is required`. A picture that did not come from an upload returns `400` with `Picture is not valid`. Unknown handle on a friend request returns `404` with `Unknown handle`. Adding yourself, a duplicate request, and an existing friendship return `409`. Accept and decline by someone other than the addressee return `403` with `Not your request`. A reader who is not an admin receives `403` with `Not an admin`.

## Client

`NativeProvider` → router → `ContentArea`. Signed-in readers with a handle see `Masthead`, the desk, the colophon, and the mobile tab bar. Guests hitting `/` go to `/login`. Google and Apple users without `handle` stay on `/register`.

The desk waits on `GET /api/auth/me` before it opens. The session cookie rolls forward on each response that already presented it. A `401` on a signed-in call reads that route and retries the call once. When the cookie is still missing and a reader was saved, the page reloads once so the browser can attach it, and the paste stays in the box. A second `401` clears the saved reader and returns to sign-in.

`SocketWatcher` connects after sign-in and emits `identify` with `user_id`. `PushWatcher` registers the APNs token and the FCM token after sign-in on a native build. Sign-out deletes that APNs token before the session ends.

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
| dev | `site.thedailyscore.dev` | The Daily Score Dev |
| qa | `site.thedailyscore.qa` | The Daily Score QA |
| prod | `site.thedailyscore.prod` | The Daily Score |

The iOS launch screen centers the wordmark on paper `#FBF9F5`. The status bar uses that same paper. Status bar text is ink `#111111` (`Style.Light`). Keyboard resize is `none`. The iOS URL scheme is `Thedailyscore`. There is no camera plugin and no photo-library usage string.

`npm run s` syncs the dev flavor.

## Deployment

See `documentation/DEPLOYMENT.md`. App project `thedailyscore-528401`. Cloud Run (`us-central1`, 256Mi, min 0): `thedailyscore-qa` / `thedailyscore-prod`. Public hosts: `qa.thedailyscore.site` / `thedailyscore.site`. Shared SQL: `nash-data:northamerica-northeast1:shared-pg`, database `thedailyscore`, schemas `qa` / `prod`. Google Sign-In is shown when `GOOGLE_CLIENT_*` secrets are set. Apple Sign-In uses Services ID `site.thedailyscore.thedailyscore` in QA and `site.thedailyscore.app` in prod. It stays hidden until `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, and `APPLE_KEY` are all set. Portraits go to `gs://thedailyscore-528401-uploads`. Prod Cloud Scheduler posts hourly to `/api/internal/reminders`. `FIREBASE_SERVICE_ACCOUNT_JSON` is set for qa and prod (Firebase project `thedailyscore-cea9b`). Flavor plists live in gitignored `secrets/GoogleService-Info.{dev,qa,prod}.plist` and `npm run s` copies the matching one into the iOS app.
