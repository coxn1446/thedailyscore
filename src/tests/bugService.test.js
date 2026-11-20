jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

const { isDbHealthy, query } = require('../../server/db');
const bugQueries = require('../../server/queries/bugQueries');
const bugService = require('../../server/services/bugService');

describe('bug service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
  });

  test('files a report and rejects an empty one', async () => {
    query.mockResolvedValue({
      rows: [{ bug_report_id: 2, message: 'Unrecognized result', detail: 'nope', created_at: '2026-11-19T12:00:00.000Z' }],
    });
    const saved = await bugService.file(4, { message: 'Unrecognized result', detail: 'nope' });
    expect(saved.report.bug_report_id).toBe(2);
    expect(query).toHaveBeenCalledWith(bugQueries.insertReport, [4, 'Unrecognized result', 'nope']);
    await expect(bugService.file(4, { message: '   ' })).rejects.toMatchObject({ status: 400, message: 'A report is required' });
  });

  test('lists reports for the admin desk', async () => {
    query.mockResolvedValue({
      rows: [{
        bug_report_id: '2',
        message: 'Unrecognized result',
        detail: 'nope',
        seen: false,
        created_at: '2026-11-19T12:00:00.000Z',
        handle: 'ada',
        display_name: 'Ada',
      }],
    });
    const listed = await bugService.list();
    expect(listed.reports[0]).toMatchObject({ bug_report_id: 2, message: 'Unrecognized result', handle: 'ada', seen: false });
  });

  test('refuses a report when the database is down', async () => {
    isDbHealthy.mockReturnValue(false);
    await expect(bugService.file(4, { message: 'Unrecognized result' })).rejects.toMatchObject({ status: 503 });
  });
});
