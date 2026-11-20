const insertReport = `
  INSERT INTO bug_reports (user_id, message, detail)
  VALUES ($1, $2, $3)
  RETURNING bug_report_id, message, detail, seen, created_at
`;

const listReports = `
  SELECT
    b.bug_report_id,
    b.message,
    b.detail,
    b.seen,
    b.created_at,
    u.handle,
    u.display_name
  FROM bug_reports b
  JOIN users u ON u.user_id = b.user_id
  ORDER BY b.created_at DESC, b.bug_report_id DESC
`;

const countUnseen = `
  SELECT COUNT(*)::int AS count
  FROM bug_reports
  WHERE seen = FALSE
`;

const markSeen = `
  UPDATE bug_reports
  SET seen = TRUE
  WHERE seen = FALSE
`;

module.exports = {
  insertReport,
  listReports,
  countUnseen,
  markSeen,
};
