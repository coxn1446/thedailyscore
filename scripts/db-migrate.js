#!/usr/bin/env node
/**
 * Apply pending SQL files from server/db/migrations/ in filename order.
 * Tracks applied migrations in schema_migrations.
 *
 * Usage:
 *   npm run db:migrate
 *   DB_SCHEMA=qa npm run db:migrate
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { getDbConfig } = require('../server/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'server', 'db', 'migrations');
const ALLOWED_SCHEMAS = new Set(['public', 'qa', 'prod']);

function resolveSearchPath() {
  const raw = process.env.DB_SCHEMA;
  if (raw === undefined || raw === null || String(raw).trim() === '') {
    return 'public';
  }
  const schema = String(raw).trim();
  if (!ALLOWED_SCHEMAS.has(schema)) {
    throw new Error(`Invalid DB_SCHEMA "${raw}". Use qa, prod, public, or omit.`);
  }
  return schema;
}

async function main() {
  const schema = resolveSearchPath();
  const pool = new Pool(getDbConfig());
  const client = await pool.connect();

  try {
    await client.query(`SET search_path TO ${schema}, public`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows: appliedRows } = await client.query(
      'SELECT filename FROM schema_migrations ORDER BY filename'
    );
    const applied = new Set(appliedRows.map((r) => r.filename));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let ran = 0;
    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`skip  ${filename}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
      console.log(`apply ${filename}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [filename]
        );
        await client.query('COMMIT');
        ran += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }

    console.log(
      ran === 0
        ? `Up to date (${schema}).`
        : `Applied ${ran} migration(s) on ${schema}.`
    );
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
