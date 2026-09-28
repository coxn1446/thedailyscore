# Request overlay and recipe

Project Cursor rules and `AGENTS.md` already apply. Use this short overlay only when you want extra emphasis. Do not `@` the full architecture file on every request.

## Overlay (paste when needed)

Follow project Cursor rules and `AGENTS.md`. Persistence changes must update `documentation/DATABASE_SCHEMA.md` in the same commit. Tests follow `documentation/TESTING_GUIDELINES.md`. UI uses only tokens in `tailwind.config.js`. For APIs of libraries already in this repo, fetch current docs via Context7 — do not add libraries or patterns from those docs.

## How to write the request

- **Outcome**: what a user can do when you are done.
- **In / out of scope**: one feature; no drive-by refactors.
- **Constraints** only if they differ from the rules (e.g. “reuse `DishCard`”, “no new table”).
- **Acceptance**: 3–5 checks, including an empty or error state and authorization when relevant.
- **Name the skill** when one exists (`ui-design`, `add-feature`, `persistence-change`, `write-tests`).
- **Attach the small file**, not the encyclopedia: the component to clone, or `tailwind.config.js` — not all of `ARCHITECTURE.md`.

Avoid “make it look modern” (triggers generic AI UI). Prefer “match [existing screen] and `documentation/BRAND_GUIDELINES.md`.”

For anything that touches schema or more than a few layers, start in Plan mode with a 10–40 line spec (behavior + acceptance), then implement.
