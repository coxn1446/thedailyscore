jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

const { isDbHealthy, query } = require('../../server/db');
const notificationQueries = require('../../server/queries/notificationQueries');
const notificationService = require('../../server/services/notificationService');

describe('notification service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
  });

  test('stores a like for the author and skips a self notice', async () => {
    query.mockResolvedValue({ rows: [{ notification_id: 3 }] });
    const saved = await notificationService.record({
      userId: 4,
      actorId: 8,
      kind: 'like',
      scoreId: 9,
    });
    expect(saved.notification_id).toBe(3);
    expect(query).toHaveBeenCalledWith(notificationQueries.insertNotification, [4, 8, 'like', 9, null]);
    await expect(notificationService.record({ userId: 4, actorId: 4, kind: 'like', scoreId: 9 })).resolves.toBeNull();
  });

  test('lists notices and marks them read', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        notification_id: 3,
        kind: 'friend_request',
        score_id: null,
        friendship_id: 7,
        friendship_status: 'pending',
        read_at: null,
        created_at: '2026-11-19T12:00:00.000Z',
        actor_id: 8,
        handle: 'bea',
        display_name: 'Bea',
        portrait_url: null,
        slug: null,
        game_name: null,
      }],
    });
    const listed = await notificationService.list(4);
    expect(listed.notifications[0]).toMatchObject({
      kind: 'friend_request',
      friendship_status: 'pending',
      read: false,
      actor: { handle: 'bea' },
    });
    query.mockResolvedValueOnce({ rows: [{ count: 1 }] });
    await expect(notificationService.unreadCount(4)).resolves.toEqual({ count: 1 });
    query.mockResolvedValueOnce({ rows: [] });
    await expect(notificationService.markRead(4)).resolves.toEqual({ count: 0 });
    expect(query).toHaveBeenCalledWith(notificationQueries.markRead, [4]);
  });

  test('refuses a signed-out count when the database is down', async () => {
    isDbHealthy.mockReturnValue(false);
    await expect(notificationService.list(4)).rejects.toMatchObject({ status: 503 });
  });
});
