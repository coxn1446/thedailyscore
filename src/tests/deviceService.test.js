jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

const { query } = require('../../server/db');
const deviceQueries = require('../../server/queries/deviceQueries');
const deviceService = require('../../server/services/deviceService');

describe('deviceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stores a token and removes only that caller’s token', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql === deviceQueries.clearFcmToken) return { rows: [] };
      if (sql === deviceQueries.upsertToken) {
        return {
          rows: [{
            device_token_id: 1,
            user_id: params[0],
            token: params[1],
            fcm_token: params[2],
            platform: params[3],
          }],
        };
      }
      if (sql === deviceQueries.deleteToken) {
        return { rows: params[0] === 4 ? [{ token: params[1] }] : [] };
      }
      throw new Error('unexpected sql');
    });

    const saved = await deviceService.register(4, { token: 'abc', fcm_token: 'fcm-abc', platform: 'ios' });
    expect(saved).toEqual({ token: 'abc', fcm_token: 'fcm-abc', platform: 'ios' });
    expect(query).toHaveBeenCalledWith(deviceQueries.clearFcmToken, ['fcm-abc', 'abc']);
    expect(query).toHaveBeenCalledWith(deviceQueries.upsertToken, [4, 'abc', 'fcm-abc', 'ios']);

    await expect(deviceService.register(4, { token: '', fcm_token: 'fcm-abc', platform: 'ios' })).rejects.toMatchObject({ status: 400 });
    await expect(deviceService.register(4, { token: 'abc', platform: 'ios' })).rejects.toMatchObject({
      status: 400,
      message: 'FCM token is required',
    });
    const removed = await deviceService.remove(4, { token: 'abc' });
    expect(removed).toEqual({ removed: true });
    const other = await deviceService.remove(8, { token: 'abc' });
    expect(other).toEqual({ removed: false });
  });
});
