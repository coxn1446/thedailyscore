# The Daily Score

Paste a daily-game result, parse it, and file it on the global leaderboard. Friends can filter that board. Share to Instagram builds a branded story.

## Stack

React 19 (Vite 6) + Redux Toolkit 2 + Tailwind CSS 4 + Ionic React 8 + Capacitor 7, Express 5 + PostgreSQL (`pg` 8) + Passport sessions. Socket.io carries the group parlor. `@capacitor/push-notifications` registers a device token; Firebase Admin sends the pushes. Stripe may remain installed and unwired. Versions live in `package.json`. Do not add dependencies unless `documentation/ARCHITECTURE.md` allows them.

## Docs (read when relevant — do not inline unless asked)

- `documentation/ARCHITECTURE.md` — current-state architecture, APIs, features
- `documentation/DATABASE_SCHEMA.md` — schema source of truth (`users`, `games`, `groups`, `group_members`, `group_games`, `scores`)
- `documentation/TESTING_GUIDELINES.md` — test layout and mocks
- `documentation/BRAND_GUIDELINES.md` — Editorial Broadsheet
- `documentation/SCREENS.md` — chrome and later desk layouts
- `tailwind.config.js` — design tokens (paper, ink, carmine)

## Constraints

- No new patterns, dependencies, or abstractions unless architecture docs allow them.
- Layering: UI components → `src/helpers/` → `server/routes/` → `server/services/` → `server/queries/`.
- Persistence changes update `documentation/DATABASE_SCHEMA.md` in the same commit, plus `server/db/schema.sql` and `server/db/migrations/` (`npm run db:migrate`). On Cloud SQL, respect schemas `qa` / `prod`.
- Every behavior change includes tests (happy path, failure/edge, authorization when relevant).
- UI uses existing Tailwind tokens only. Follow `BRAND_GUIDELINES.md`. Clone the masthead, auth panel, or desk rather than inventing chrome.
- Core IA is Home, Board, Profile. Board is the global leaderboard (`?game=`, `?period=` of `today`, `week`, or `all`, `?view=` of `scores` or `board`, and `?scope=` of `global` or `friends`). All-time possible days start at that game’s first puzzle date and are the same for every player. Friends are exact-handle requests. A request the other way accepts. The Friends scope holds the handle field and the pending lists. The paste row is the Games plus, the copy icon, and, on iOS, the Instagram icon. Share to Instagram opens beside Copy Today's Score on iOS only. A gear on the edition line on a phone, without a border, and a bordered gear on Home on a wide screen, plus Select Your Games in Profile Settings, choose which catalog games appear. Names on the board open `/profile/:handle`, and Follow stays on that profile. Friendship requests is a Profile tab, and its incoming count badges that tab and the Profile nav. Profile Stats charts the reader’s scores over time, one line per game, and each legend name hides that line. Each game is scaled from its low score to its high score. Game logos from `src/assets/gamelogos` sit on Home, Board, Profile, and the story. `/groups`, `/messages`, and `/join/:token` redirect to Board. Group and parlor tables stay in the database and are not linked. Home posts with an empty group list. A successful post clears the paste field, and today’s global rank is a toast. Post stays on the right of the preview, where Submit sat. On the iOS app, pulling down from the top of Home reloads the feed. A like updates on the card before the server answers. Each feed card shows when the score was filed. A like and a comment each send one push to the post’s author when notifications are on. A friend request and an accept each send one push when notifications are on. The 8pm reminder stays. Profile is Stats, then Profile. The archive can delete a score and does not edit group sharing. Night mode is a switch in Profile Settings and is stored on the account. Do not put a kicker or deck back under the Home paste headline. Do not send a push from the identity save. Do not add a cron library or a scheduler dependency. An unrecognized paste writes nothing and links to a game request. A second paste of the same puzzle is rejected with `you've already uploaded this score`. Mobile tab bar is Home, Board, and Profile, and Admin for an admin, icons with names underneath. Desktop nav stays text links. An unseen game request badges Admin.
- Do not add `@capacitor/camera` or photo-library Info.plist strings.
- Keyboard: `KeyboardResize.None`. iOS OAuth uses the system browser.

## Commands

- `npm test` — Jest
- `npm run dev` — Vite + Express
- `npm run db:migrate` — incremental SQL
- `npm run s` — Capacitor iOS sync (dev bundle id)

## Library docs

For APIs of packages **already in `package.json`**, fetch current docs via Context7 (or official docs). Do not treat those docs as permission to change architecture or add libraries.
