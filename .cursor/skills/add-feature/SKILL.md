---
name: add-feature
description: Adds an App Shell feature as one vertical slice (access patterns, schema, queries, service, route, helper, UI, tests). Use when creating a new product capability that spans client and server.
---

# Add feature (App Shell)

Ship one slice. Do not add speculative folders or dependencies.

## Order

1. **Access patterns** — who reads/writes, public vs session, owner checks.
2. **Data** — if persistence changes, use the `persistence-change` skill first.
3. **`server/queries/[feature]Queries.js`** — parameterized SQL; export through `server/queries/index.js` if that aggregator exists.
4. **`server/services/[feature]Service.js`** — business rules only.
5. **`server/routes/[feature].js`** — HTTP + validation; mount in `server/routes/index.js`.
6. **`src/helpers/[feature]Helpers.js`** — `fetch` to `/api/...`; no JSX.
7. **UI** — `src/components/[Feature]/` + lazy route if it is a page. Use the `ui-design` skill.
8. **Redux** — only if this domain already uses a slice (or architecture says it must). Prefer server as source of truth after mutations.
9. **Tests** — use the `write-tests` skill.
10. **Docs** — update Features + API Endpoints in `documentation/ARCHITECTURE.md` as current state after it works.

## Layering

Components → helpers → routes → services → queries. Do not skip a layer or put SQL in a route.

## Plan first

If the slice touches schema or more than three of the steps above, write a 10–40 line spec (outcome + acceptance) and implement against that spec.
