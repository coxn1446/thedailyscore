jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(),
  query: jest.fn(),
}));

const { isDbHealthy, query } = require('../../server/db');
const gameRequestQueries = require('../../server/queries/gameRequestQueries');
const adminService = require('../../server/services/adminService');

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
  });

  test('lists requests newest first with the submitter', async () => {
    query.mockResolvedValue({
      rows: [{
        request_id: '3',
        game_name: 'Quordle',
        note: 'daily',
        seen: false,
        created_at: '2026-11-16T15:00:00.000Z',
        handle: 'ada',
        display_name: 'Ada',
      }],
    });
    const payload = await adminService.listRequests();
    expect(query).toHaveBeenCalledWith(gameRequestQueries.listRequests);
    expect(payload.requests[0]).toMatchObject({
      request_id: 3,
      game_name: 'Quordle',
      note: 'daily',
      seen: false,
      handle: 'ada',
      display_name: 'Ada',
    });
  });

  test('counts unseen requests and marks them seen', async () => {
    query.mockResolvedValueOnce({ rows: [{ count: 2 }] });
    const unseen = await adminService.unseenCount();
    expect(unseen).toEqual({ count: 2 });
    expect(query).toHaveBeenCalledWith(gameRequestQueries.countUnseen);

    query.mockResolvedValueOnce({ rows: [] });
    const cleared = await adminService.markSeen();
    expect(cleared).toEqual({ count: 0 });
    expect(query).toHaveBeenCalledWith(gameRequestQueries.markSeen);
  });
});
