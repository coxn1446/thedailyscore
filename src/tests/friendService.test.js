jest.mock('../../server/services/pushService', () => ({
  notifyFriendRequest: jest.fn(() => Promise.resolve({ sent: 1 })),
  notifyFriendAccept: jest.fn(() => Promise.resolve({ sent: 1 })),
}));

jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

const { query } = require('../../server/db');
const friendQueries = require('../../server/queries/friendQueries');
const notificationQueries = require('../../server/queries/notificationQueries');
const userQueries = require('../../server/queries/userQueries');
const pushService = require('../../server/services/pushService');
const friendService = require('../../server/services/friendService');

const users = [
  { user_id: 4, handle: 'ada', display_name: 'Ada', portrait_url: null, suspended: false },
  { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null, suspended: false },
];

let rows;
let nextId;

const install = () => {
  query.mockImplementation(async (sql, params) => {
    if (sql === userQueries.findByHandle) {
      const handle = String(params[0]).toLowerCase();
      return { rows: users.filter((user) => user.handle === handle) };
    }
    if (sql === userQueries.findById) {
      return { rows: users.filter((user) => user.user_id === Number(params[0])) };
    }
    if (sql === friendQueries.findPair) {
      const [left, right] = params.map(Number);
      return {
        rows: rows.filter((row) => (
          (row.requester_id === left && row.addressee_id === right)
          || (row.requester_id === right && row.addressee_id === left)
        )),
      };
    }
    if (sql === friendQueries.insertRequest) {
      const created = {
        friendship_id: nextId,
        requester_id: Number(params[0]),
        addressee_id: Number(params[1]),
        status: 'pending',
      };
      nextId += 1;
      rows.push(created);
      return { rows: [created] };
    }
    if (sql === friendQueries.acceptRequest) {
      const row = rows.find((item) => item.friendship_id === Number(params[0]) && item.addressee_id === Number(params[1]) && item.status === 'pending');
      if (!row) return { rows: [] };
      row.status = 'accepted';
      return { rows: [row] };
    }
    if (sql === friendQueries.declineRequest) {
      const row = rows.find((item) => item.friendship_id === Number(params[0]) && item.addressee_id === Number(params[1]) && item.status === 'pending');
      if (!row) return { rows: [] };
      row.status = 'declined';
      return { rows: [row] };
    }
    if (sql === friendQueries.rewriteRequest) {
      const row = rows.find((item) => item.friendship_id === Number(params[0]));
      row.requester_id = Number(params[1]);
      row.addressee_id = Number(params[2]);
      row.status = 'pending';
      return { rows: [row] };
    }
    if (sql === friendQueries.listForUser) return { rows: [] };
    if (sql === friendQueries.listAcceptedIds) return { rows: [] };
    if (sql === notificationQueries.insertNotification) return { rows: [{ notification_id: 1 }] };
    throw new Error(`unexpected sql ${String(sql).slice(0, 40)}`);
  });
};

describe('friendService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
    nextId = 1;
    install();
  });

  test('requests, accepts the other direction, and rejects duplicates', async () => {
    const sent = await friendService.request(4, 'Bea');
    expect(sent.status).toBe('pending');
    expect(sent.user.handle).toBe('bea');
    expect(pushService.notifyFriendRequest).toHaveBeenCalledWith({
      addresseeId: 8,
      actor: expect.objectContaining({ handle: 'ada' }),
    });
    expect(query).toHaveBeenCalledWith(
      notificationQueries.insertNotification,
      [8, 4, 'friend_request', null, sent.friendship_id]
    );

    await expect(friendService.request(4, 'bea')).rejects.toMatchObject({
      status: 409,
      message: 'Request already sent',
    });

    const accepted = await friendService.request(8, 'ada');
    expect(accepted.status).toBe('accepted');
    expect(pushService.notifyFriendAccept).toHaveBeenCalled();

    await expect(friendService.request(4, 'bea')).rejects.toMatchObject({
      status: 409,
      message: 'Already friends',
    });
  });

  test('rejects a self request and an unknown handle', async () => {
    await expect(friendService.request(4, 'ada')).rejects.toMatchObject({
      status: 409,
      message: 'You cannot add yourself',
    });
    await expect(friendService.request(4, 'missing')).rejects.toMatchObject({
      status: 404,
      message: 'Unknown handle',
    });
  });

  test('lets the addressee decline and blocks the requester', async () => {
    const sent = await friendService.request(4, 'bea');
    await expect(friendService.respond(4, sent.friendship_id, 'declined')).rejects.toMatchObject({
      status: 403,
      message: 'Not your request',
    });
    const declined = await friendService.respond(8, sent.friendship_id, 'declined');
    expect(declined.status).toBe('declined');
    const again = await friendService.request(4, 'bea');
    expect(again.status).toBe('pending');
  });

  test('lists handle matches with a friendship status', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === friendQueries.searchHandles) {
        return {
          rows: [
            { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null, friendship_id: null, status: null, requester_id: null },
            { user_id: 9, handle: 'bee', display_name: 'Bee', portrait_url: null, friendship_id: 3, status: 'pending', requester_id: 4 },
          ],
        };
      }
      throw new Error('unexpected sql');
    });
    const found = await friendService.search(4, 'be');
    expect(found.users.map((user) => [user.handle, user.relation])).toEqual([
      ['bea', 'none'],
      ['bee', 'outgoing'],
    ]);
  });
});
