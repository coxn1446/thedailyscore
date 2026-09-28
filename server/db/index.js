/**
 * PostgreSQL connection pool.
 *
 * - Development: local PostgreSQL via DB_HOST/DB_PORT
 * - QA/Production: Cloud SQL via unix socket
 *
 * Local auth requires a healthy database (schema.sql + migrations).
 */
const { Pool } = require('pg');

let pool = null;
let dbHealthy = false;

const HEALTH_CHECK_RETRIES = 3;
const HEALTH_CHECK_DELAY_MS = 2000;

const ALLOWED_DB_SCHEMAS = new Set(['qa', 'prod']);

const getPgPoolOptionsFromEnv = () => {
  const raw = process.env.DB_SCHEMA;
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === '' || s === 'public') return null;
  if (!ALLOWED_DB_SCHEMAS.has(s)) {
    throw new Error(`Invalid DB_SCHEMA "${raw}". Use qa, prod, public, or omit.`);
  }
  return `-c search_path=${s},public`;
};

const resolveUnixSocketHost = () => {
  const raw = process.env.DB_INSTANCE_UNIX_SOCKET || process.env.INSTANCE_CONNECTION_NAME || '';
  if (!raw) return '';
  return raw.startsWith('/cloudsql/') ? raw : `/cloudsql/${raw}`;
};

const buildConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const options = getPgPoolOptionsFromEnv();
  const isCloudEnv = env === 'production' || env === 'qa';
  const socketHost = resolveUnixSocketHost();

  const base = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    max: isCloudEnv ? 5 : 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: isCloudEnv ? 10000 : 5000,
  };

  let config;
  if (isCloudEnv && socketHost) {
    config = { ...base, host: socketHost };
  } else {
    config = {
      ...base,
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
    };
  }

  if (options) config.options = options;
  return config;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initDb = async () => {
  pool = new Pool(buildConfig());

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
    dbHealthy = false;
  });

  for (let attempt = 1; attempt <= HEALTH_CHECK_RETRIES; attempt++) {
    try {
      await pool.query('SELECT 1');
      dbHealthy = true;
      const schema = process.env.DB_SCHEMA ? String(process.env.DB_SCHEMA).trim() : 'default';
      console.log(`Database connection established (schema: ${schema}).`);
      return;
    } catch (err) {
      if (err.message && err.message.startsWith('Invalid DB_SCHEMA')) throw err;
      console.warn(`Database health check ${attempt}/${HEALTH_CHECK_RETRIES} failed: ${err.message}`);
      if (attempt < HEALTH_CHECK_RETRIES) await sleep(HEALTH_CHECK_DELAY_MS);
    }
  }

  console.warn('Database unreachable. Auth will fail until Postgres is available and schema.sql is applied.');
};

const getPool = () => pool;
const isDbHealthy = () => dbHealthy;

const query = (text, params) => {
  if (!pool) throw new Error('Database pool not initialized');
  return pool.query(text, params);
};

const withTransaction = async (fn) => {
  if (!pool) throw new Error('Database pool not initialized');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
};

const closeDb = async () => {
  if (pool) {
    await pool.end().catch(() => {});
    pool = null;
    dbHealthy = false;
    console.log('Database pool closed.');
  }
};

module.exports = {
  initDb,
  closeDb,
  getPool,
  isDbHealthy,
  query,
  withTransaction,
  getDbConfig: buildConfig,
  getPgPoolOptionsFromEnv,
};
