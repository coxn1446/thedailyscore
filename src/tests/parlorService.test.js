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
  notifyReaction: jest.fn(() => Promise.resolve({ sent: 0 })),
}));

const { query } = require('../../server/db');
const { emitToRoom } = require('../../server/socket');
const pushService = require('../../server/services/pushService');
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
      if (sql === parlorQueries.messageInGroup) {
        return { rows: [{ message_id: params[0], user_id: 8, game_id: 2, slug: 'krillion' }] };
      }
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
    expect(pushService.notifyReaction).toHaveBeenCalledWith({
      groupId: 10,
      actorUserId: 4,
      actorName: 'Ada',
      authorUserId: 8,
    });
    const cleared = await parlorService.setReaction(ada, 10, 7, 'heart');
    expect(cleared.reactions).toEqual([]);
    expect(pushService.notifyReaction).toHaveBeenCalledTimes(1);
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

  test('lists up to three recent chatters and drops a broken chatter payload', async () => {
    expect(parlorQueries.listConversations).toMatch(/LIMIT 3/);
    expect(parlorQueries.listConversations).toMatch(/portrait_url/);
    expect(parlorQueries.listConversations).not.toMatch(/AS last_message/);
    expect(parlorQueries.listConversations).toMatch(/ORDER BY unread_count DESC/);

    query.mockImplementation(async (sql) => {
      if (sql === parlorQueries.listConversations) {
        return {
          rows: [
            {
              group_id: '10',
              group_name: 'Agawam Trivia',
              game_id: '2',
              slug: 'krillion',
              game_name: 'Krillion',
              unread_count: '2',
              recent_chatters: [
                { user_id: '8', display_name: 'Bea', handle: 'bea', portrait_url: '/uploads/bea.png' },
                { user_id: '9', display_name: '', handle: 'cy', portrait_url: null },
                { user_id: '10', display_name: 'Dee', handle: 'dee', portrait_url: '/uploads/dee.png' },
                { user_id: '11', display_name: 'Eve', handle: 'eve', portrait_url: null },
              ],
            },
            {
              group_id: 11,
              group_name: 'Quiet desk',
              game_id: 1,
              slug: 'wordle',
              game_name: 'Wordle',
              unread_count: 0,
              recent_chatters: 'not-json',
            },
          ],
        };
      }
      throw new Error('unexpected sql');
    });

    const listed = await parlorService.listConversations(4);
    expect(listed.conversations[0]).toEqual({
      group_id: 10,
      group_name: 'Agawam Trivia',
      game_id: 2,
      slug: 'krillion',
      game_name: 'Krillion',
      unread_count: 2,
      recent_chatters: [
        { user_id: 8, display_name: 'Bea', handle: 'bea', portrait_url: '/uploads/bea.png' },
        { user_id: 9, display_name: '', handle: 'cy', portrait_url: null },
        { user_id: 10, display_name: 'Dee', handle: 'dee', portrait_url: '/uploads/dee.png' },
      ],
    });
    expect(listed.conversations[0].recent_chatters).toHaveLength(3);
    expect(listed.conversations[1].recent_chatters).toEqual([]);
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

  test('posts rankings once when every member has filed today', async () => {
    const filings = [
      {
        user_id: 4,
        score_id: 1,
        score: 355,
        guesses: null,
        solved: true,
        display_name: 'Ada',
        handle: 'ada',
        portrait_url: null,
        guess_cap: null,
        rank_basis: 'score',
        sort_direction: 'higher',
        game_name: 'Krillion',
        slug: 'krillion',
        member_count: 2,
      },
      {
        user_id: 8,
        score_id: 2,
        score: 200,
        guesses: null,
        solved: true,
        display_name: 'Bea',
        handle: 'bea',
        portrait_url: null,
        guess_cap: null,
        rank_basis: 'score',
        sort_direction: 'higher',
        game_name: 'Krillion',
        slug: 'krillion',
        member_count: 2,
      },
    ];
    let noted = false;
    const inserts = [];
    query.mockImplementation(async (sql, params) => {
      if (sql === parlorQueries.todayFilings) return { rows: filings };
      if (sql === parlorQueries.standingsToday) return { rows: noted ? [{ message_id: 9 }] : [] };
      if (sql === parlorQueries.findParlorByGroup) return { rows: [{ parlor_id: 3, group_id: 10 }] };
      if (sql === parlorQueries.insertStandings) {
        noted = true;
        const row = {
          message_id: 9,
          game_id: 2,
          user_id: 4,
          body: params[3],
          kind: 'standings',
          created_at: '2026-11-04T15:00:00.000Z',
        };
        inserts.push(row);
        return { rows: [row] };
      }
      throw new Error(`unexpected sql ${String(sql).slice(0, 48)}`);
    });
    const game = { game_id: 2, slug: 'krillion', name: 'Krillion', rank_basis: 'score', sort_direction: 'higher' };
    await parlorService.noteStandings({ userId: 4, game, groups: [] });
    expect(inserts).toHaveLength(0);

    await parlorService.noteStandings({ userId: 4, game, groups: [{ group_id: 10 }] });
    expect(inserts).toHaveLength(1);
    expect(emitToRoom).toHaveBeenCalledWith('group:10:game:2', 'parlor:message', expect.objectContaining({
      kind: 'standings',
      body: 'Rankings\n1. Ada — 355\n2. Bea — 200',
    }));
    expect(pushService.notifyParlor).toHaveBeenCalledWith(expect.objectContaining({
      groupId: 10,
      body: 'Krillion rankings are in.',
    }));

    await parlorService.noteStandings({ userId: 4, game, groups: [{ group_id: 10 }] });
    expect(inserts).toHaveLength(1);
  });
});
