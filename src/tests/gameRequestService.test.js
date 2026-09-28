jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(),
  query: jest.fn(),
}));

const { isDbHealthy, query } = require('../../server/db');
const gameRequestQueries = require('../../server/queries/gameRequestQueries');
const gameRequestService = require('../../server/services/gameRequestService');

describe('gameRequestService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
  });

  test('stores a request for the signed-in reader', async () => {
    query.mockResolvedValue({
      rows: [{ request_id: 1, user_id: 4, game_name: 'Quordle', note: 'daily' }],
    });
    const payload = await gameRequestService.file(4, { game_name: ' Quordle ', note: ' daily ' });
    expect(payload.request.game_name).toBe('Quordle');
    expect(query).toHaveBeenCalledWith(gameRequestQueries.insertRequest, [4, 'Quordle', 'daily']);
  });

  test('rejects an empty game name', async () => {
    await expect(gameRequestService.file(4, { game_name: '  ' })).rejects.toMatchObject({
      status: 400,
      message: 'Game name is required',
    });
    expect(query).not.toHaveBeenCalled();
  });
});
