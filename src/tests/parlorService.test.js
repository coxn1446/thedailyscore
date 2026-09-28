jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

jest.mock('../../server/socket', () => ({
  emitToRoom: jest.fn(),
  roomName: (groupId, gameId) => `group:${groupId}:game:${gameId}`,
}));

jest.mock('../../server/services/pushService', () => ({
  notifyParlor: jest.fn(() => Promise.resolve({ sent: 0 })),
}));

const { query } = require('../../server/db');
const { emitToRoom } = require('../../server/socket');
const groupQueries = require('../../server/queries/groupQueries');
const parlorQueries = require('../../server/queries/parlorQueries');
const parlorService = require('../../server/services/parlorService');

const ada = { user_id: 4, handle: 'ada', display_name: 'Ada', portrait_url: null };
const bea = { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null };

describe('parlorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('refuses a non-member and stores a message for a member', async () => {
    const messages = [];
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findMember) {
        const allowed = params[1] === ada.user_id;
        return { rows: allowed ? [{ group_id: 10, user_id: 4, role: 'fellow' }] : [] };
      }
      if (sql === parlorQueries.postedGameToday) {
        return { rows: [{ game_id: 2, slug: params[1], name: 'Krillion' }] };
      }
      if (sql === parlorQueries.findParlorByGroup) return { rows: [{ parlor_id: 3, group_id: 10 }] };
      if (sql === parlorQueries.insertMessage) {
        const row = {
          message_id: 7,
          game_id: params[1],
          user_id: params[2],
          body: params[3],
          created_at: '2026-09-28T12:00:00.000Z',
        };
        messages.push(row);
        return { rows: [row] };
      }
      throw new Error(`unexpected sql ${String(sql).slice(0, 40)}`);
    });

    await expect(parlorService.listMessages(bea.user_id, 10, 'krillion', null)).rejects.toMatchObject({
      status: 403,
      message: 'Not a member',
    });
    await expect(parlorService.postMessage(bea, 10, 'hello', 'krillion')).rejects.toMatchObject({
      status: 403,
      message: 'Not a member',
    });
    expect(messages).toHaveLength(0);
    expect(emitToRoom).not.toHaveBeenCalled();

    const posted = await parlorService.postMessage(ada, 10, '  hello desk  ', 'krillion');
    expect(messages).toEqual([
      expect.objectContaining({ body: 'hello desk', user_id: 4 }),
    ]);
    expect(posted.message.body).toBe('hello desk');
    expect(emitToRoom).toHaveBeenCalledWith('group:10:game:2', 'parlor:message', expect.objectContaining({
      body: 'hello desk',
      user_id: 4,
      group_id: 10,
      game_slug: 'krillion',
    }));
  });

  test('toggles a reaction for a member', async () => {
    let kind = null;
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === parlorQueries.messageInGroup) return { rows: [{ message_id: params[0], game_id: 2, slug: 'krillion' }] };
      if (sql === parlorQueries.postedGameToday) return { rows: [{ game_id: 2, slug: 'krillion', name: 'Krillion' }] };
      if (sql === parlorQueries.findReaction) return { rows: kind ? [{ kind }] : [] };
      if (sql === parlorQueries.upsertReaction) {
        kind = params[2];
        return { rows: [{ kind }] };
      }
      if (sql === parlorQueries.deleteReaction) {
        kind = null;
        return { rows: [] };
      }
      if (sql === parlorQueries.listReactions) {
        return { rows: kind ? [{ message_id: 7, kind, count: 1, mine: true }] : [] };
      }
      throw new Error(`unexpected sql ${String(sql).slice(0, 40)}`);
    });
    const added = await parlorService.setReaction(ada, 10, 7, 'heart');
    expect(added.reactions).toEqual([{ kind: 'heart', count: 1, mine: true }]);
    const cleared = await parlorService.setReaction(ada, 10, 7, 'heart');
    expect(cleared.reactions).toEqual([]);
    await expect(parlorService.setReaction(ada, 10, 7, 'nope')).rejects.toMatchObject({ status: 400 });
  });

  test('marks the parlor read for a member', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === parlorQueries.postedGameToday) return { rows: [{ game_id: 2, slug: params[1], name: 'Krillion' }] };
      if (sql === parlorQueries.latestMessageId) return { rows: [{ message_id: 7 }] };
      if (sql === parlorQueries.markRead) return { rows: [{ last_read_message_id: params[3] }] };
      throw new Error('unexpected sql');
    });
    await expect(parlorService.markRead(4, 10, 'krillion')).resolves.toEqual({ unread_count: 0 });
    expect(query).toHaveBeenCalledWith(parlorQueries.markRead, [4, 10, 2, 7]);
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findMember) return { rows: [] };
      throw new Error('should not write');
    });
    await expect(parlorService.markRead(8, 10, 'krillion')).rejects.toMatchObject({ status: 403 });
  });

  test('rejects an empty message', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === parlorQueries.postedGameToday) return { rows: [{ game_id: 2, slug: params[1], name: 'Krillion' }] };
      throw new Error('should not write');
    });
    await expect(parlorService.postMessage(ada, 10, '   ', 'krillion')).rejects.toMatchObject({
      status: 400,
      message: 'Write a message',
    });
  });

  test('hides a conversation until that game is posted today', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === parlorQueries.postedGameToday) return { rows: [] };
      throw new Error('should not read messages');
    });
    await expect(parlorService.listMessages(ada.user_id, 10, 'maptap', null)).rejects.toMatchObject({
      status: 403,
      message: 'Not posted today',
    });
  });
});
