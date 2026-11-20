const { isDbHealthy, query } = require('../db');
const bugQueries = require('../queries/bugQueries');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const MESSAGE_LIMIT = 500;
const DETAIL_LIMIT = 8000;

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const file = async (userId, body = {}) => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message || message.length > MESSAGE_LIMIT) httpError(400, 'A report is required');
  let detail = typeof body.detail === 'string' ? body.detail.trim() : '';
  if (!detail) detail = null;
  if (detail && detail.length > DETAIL_LIMIT) detail = detail.slice(0, DETAIL_LIMIT);
  const { rows } = await query(bugQueries.insertReport, [userId, message, detail]);
  return {
    report: {
      bug_report_id: Number(rows[0].bug_report_id),
      message: rows[0].message,
      created_at: rows[0].created_at,
    },
  };
};

const list = async () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
  const listed = await query(bugQueries.listReports);
  return {
    reports: listed.rows.map((row) => ({
      bug_report_id: Number(row.bug_report_id),
      message: row.message,
      detail: row.detail || '',
      seen: row.seen === true || row.seen === 't',
      created_at: row.created_at ? new Date(row.created_at).toISOString() : null,
      handle: row.handle,
      display_name: row.display_name,
    })),
  };
};

module.exports = { file, list };
