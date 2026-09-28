# The Daily Score

Paste a daily-game result, parse it, and publish it to every group where that game is enabled.

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
- Core IA is Home, Groups, Profile. Chat is one conversation per group and game, hidden until that game is posted today. On a phone it opens from the chat icon in one modal, and the reader flips between that group’s enabled games there. A game not posted today links Home to submit a score. On a wide screen the open game is the third column. Mobile tab bar uses icons with names underneath; Profile uses the portrait. Desktop nav stays text links. Pushes go out for a posted score, a new member, a parlor message to a member who posted that game and has no socket, and the 8pm reminder from `POST /api/internal/reminders`. Do not send a push from the identity save. Do not add a cron library or a scheduler dependency.
- The Groups game filter and time period are route state (`?game=`, `?period=` of `today`, `week`, or `all`). Keep both when the reader switches groups. Do not put them back inside one group. The directory lists only groups that have the selected game enabled. Each directory card’s rank is the reader’s rank for that period, alone on the right, the full height of the card. Home preview lets the reader check which groups receive the paste. The checklist, Select All, and Post are one form. The button reads Deselect All when every group is checked, and Select All otherwise. No groups checked still stores the personal score and publishes nowhere. Preview still asks the reader to confirm. An unrecognized paste writes nothing and links to a game request. A second paste of the same puzzle is rejected with `you've already uploaded this score`. An older puzzle in that same form backfills the day. Profile is two tabs: Stats, then Profile (identity, portrait, export, sign out, delete). Game toggles on a group stay local until Save Changes. Delete removes that account’s memberships, publications, and scores. Do not put a kicker or deck back under the Home paste headline.
- Do not add `@capacitor/camera` or photo-library Info.plist strings.
- Keyboard: `KeyboardResize.None`. iOS OAuth uses the system browser.

## Commands

- `npm test` — Jest
- `npm run dev` — Vite + Express
- `npm run db:migrate` — incremental SQL
- `npm run s` — Capacitor iOS sync (dev bundle id)

## Library docs

For APIs of packages **already in `package.json`**, fetch current docs via Context7 (or official docs). Do not treat those docs as permission to change architecture or add libraries.
