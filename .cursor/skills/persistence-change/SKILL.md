---
name: persistence-change
description: Adds or alters PostgreSQL tables, columns, indexes, or queries while keeping schema.sql, migrations, DATABASE_SCHEMA.md, and runtime SQL consistent. Use when changing persistence or access patterns.
---

# Persistence change (App Shell)

Design from access patterns, not from a column list.

## Before SQL

Write down: entities, cardinality, who reads/writes, and the actual `WHERE` / `JOIN` paths. No speculative columns.

## Conventions

- Raw SQL via `pg`. Parameterized queries only.
- `SERIAL` / `INTEGER` keys unless architecture already uses another style.
- `TIMESTAMPTZ` for timestamps; `updated_at` trigger when other tables already have one.
- Indexes only for real filters and joins (including `LOWER(col)` if searches are case-insensitive).
- No ORM, no Prisma, no generated query layer.

## Same-commit artifacts

1. `server/db/schema.sql` for greenfield installs.
2. Incremental `server/db/migrations/NNN_description.sql` when this app uses `npm run db:migrate`.
3. `documentation/DATABASE_SCHEMA.md` — purpose, columns, indexes, FKs, triggers, Last Modified.
4. `server/queries/` — runtime SQL matches the documented names and types.

Prefer `schema.sql` plus incremental `server/db/migrations/NNN_description.sql` and `npm run db:migrate`. If this app has no migrations folder yet, still update `schema.sql` + `DATABASE_SCHEMA.md` together and note the manual SQL. On shared Cloud SQL, set `search_path` to the environment schema (`qa` / `public`) before applying SQL.

## Afterward

Update Features / API notes in `documentation/ARCHITECTURE.md` only if the product surface changed. Add or extend tests that hit the new path (including authorization).
