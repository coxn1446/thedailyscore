jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
  withTransaction: jest.fn(),
}));

jest.mock('../../server/services/pushDelivery', () => ({
  deliver: jest.fn(async () => ({ sent: 1, stale: [] })),
}));

jest.mock('../../server/socket', () => ({
  hasActiveSocket: jest.fn(() => false),
  joinSockets: jest.fn(),
  emitToRoom: jest.fn(),
  leaveGroupRoom: jest.fn(),
}));

const { query } = require('../../server/db');
const { deliver } = require('../../server/services/pushDelivery');
const { hasActiveSocket } = require('../../server/socket');
const scoreQueries = require('../../server/queries/scoreQueries');
const pushQueries = require('../../server/queries/pushQueries');
const pushService = require('../../server/services/pushService');

const game = {
  slug: 'krillion',
  name: 'Krillion',
  sort_direction: 'higher',
  rank_basis: 'score',
  board: 'daily',
  min_entries: null,
};

const wordle = {
  slug: 'wordle',
  name: 'Wordle',
  sort_direction: 'lower',
  rank_basis: 'guesses',
  board: 'weekly',
  min_entries: 4,
};

const row = (overrides) => ({
  group_id: 10,
  solved: true,
  logged_today: true,
  logged_this_week: true,
  snippet: 'CRANE',
  guesses: null,
  score: 100,
  handle: 'ada',
  display_name: 'Ada',
  ...game,
  ...overrides,
});

const members = [
  { user_id: 4, handle: 'ada', display_name: 'Ada', alert_crown: true, alert_new_member: false, alert_messages: true, alert_scores: true, group_name: 'Sunday desk' },
  { user_id: 8, handle: 'bea', display_name: 'Bea', alert_crown: true, alert_new_member: true, alert_messages: true, alert_scores: true, group_name: 'Sunday desk' },
  { user_id: 9, handle: 'cy', display_name: 'Cy', alert_crown: false, alert_new_member: false, alert_messages: false, alert_scores: false, group_name: 'Sunday desk' },
];

const tokens = [
  { user_id: 4, token: 'ada-token' },
  { user_id: 8, token: 'bea-token' },
  { user_id: 9, token: 'cy-token' },
];

const install = (weekRows, alertRows = members) => {
  query.mockImplementation(async (sql, params) => {
    if (sql === scoreQueries.listWeekRows) return { rows: weekRows };
    if (sql === pushQueries.listMemberAlerts) return { rows: alertRows };
    if (sql === pushQueries.listTokensForUsers) {
      const ids = params[0].map(Number);
      return { rows: tokens.filter((token) => ids.includes(token.user_id)) };
    }
    if (sql === pushQueries.listReminderCandidates) return { rows: params || [] };
    throw new Error(`unexpected sql ${String(sql).slice(0, 40)}`);
  });
};

describe('pushService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    hasActiveSocket.mockReturnValue(false);
  });

  test('crowns only alert_crown members and skips the poster', async () => {
    install([
      row({ score_id: 1, user_id: 8, score: 80, display_name: 'Bea', handle: 'bea' }),
      row({ score_id: 2, user_id: 4, score: 200 }),
    ]);
    await pushService.notifyCrown({ userId: 4, scoreId: 2, groups: [{ group_id: 10, name: 'Sunday desk' }] });
    expect(deliver).toHaveBeenCalledTimes(1);
    const [sentTokens, message] = deliver.mock.calls[0];
    expect(sentTokens).toEqual(['bea-token']);
    expect(message.body).toBe('Ada took 1st in Krillion.');
    expect(message.body).not.toContain('CRANE');
    expect(message.title).toBe('Sunday desk');
  });

  test('does not crown when the poster already held 1st or the toggle is off', async () => {
    install([
      row({ score_id: 1, user_id: 4, score: 300 }),
      row({ score_id: 2, user_id: 4, score: 120 }),
    ]);
    await pushService.notifyCrown({ userId: 4, scoreId: 2, groups: [{ group_id: 10 }] });
    expect(deliver).not.toHaveBeenCalled();

    install(
      [row({ score_id: 3, user_id: 4, score: 500 })],
      members.map((member) => ({ ...member, alert_crown: false }))
    );
    await pushService.notifyCrown({ userId: 4, scoreId: 3, groups: [{ group_id: 10 }] });
    expect(deliver).not.toHaveBeenCalled();
  });

  test('crowns a weekly guess average once min_entries is met, not a combined board', async () => {
    const guesses = [4, 3, 2, 5].map((guessesCount, index) => row({
      ...wordle,
      score_id: index + 1,
      user_id: 4,
      score: null,
      guesses: guessesCount,
      logged_today: index === 3,
    }));
    install([
      ...guesses,
      row({ score_id: 90, user_id: 8, score: 9999, display_name: 'Bea', handle: 'bea' }),
    ]);
    await pushService.notifyCrown({ userId: 4, scoreId: 4, groups: [{ group_id: 10 }] });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][1].body).toBe('Ada took 1st in Wordle.');
    expect(deliver.mock.calls[0][1].body).not.toContain('CRANE');

    deliver.mockClear();
    install(guesses.slice(0, 3));
    await pushService.notifyCrown({ userId: 4, scoreId: 3, groups: [{ group_id: 10 }] });
    expect(deliver).not.toHaveBeenCalled();
  });

  test('new-member push respects alert_new_member and skips the actor', async () => {
    install([]);
    await pushService.notifyNewMember({ groupId: 10, subjectUserId: 4, actorUserId: 9 });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toEqual(['bea-token']);
    expect(deliver.mock.calls[0][1].body).toBe('Ada joined.');

    deliver.mockClear();
    await pushService.notifyNewMember({ groupId: 10, subjectUserId: 4, actorUserId: 8 });
    expect(deliver).not.toHaveBeenCalled();
  });

  test('parlor push goes to members with no socket and skips the author', async () => {
    hasActiveSocket.mockImplementation((userId) => Number(userId) === 9);
    install([]);
    await pushService.notifyParlor({
      groupId: 10,
      authorUserId: 4,
      authorName: 'Ada',
      body: 'See you at the desk',
    });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toEqual(['bea-token']);
    expect(deliver.mock.calls[0][1].body).toBe('Ada messaged Sunday desk.');
  });

  test('score push uses the group score toggle and skips the poster', async () => {
    install([]);
    await pushService.notifyScore({
      userId: 4,
      gameName: 'Krillion',
      groups: [{ group_id: 10, name: 'Sunday desk' }],
    });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toEqual(['bea-token']);
    expect(deliver.mock.calls[0][1].body).toBe('Ada posted their Krillion score to Sunday desk.');
  });

  test('reminder query skips scored readers and the toggle, and the 8pm hour selects the rest', async () => {
    expect(pushQueries.listReminderCandidates).toMatch(/remind_daily = TRUE/);
    expect(pushQueries.listReminderCandidates).toMatch(/NOT EXISTS/);
    expect(pushQueries.listReminderCandidates).toMatch(/s\.created_at AT TIME ZONE u\.timezone/);

    const now = new Date('2026-09-28T00:30:00.000Z');
    query.mockImplementation(async (sql, params) => {
      if (sql === pushQueries.listReminderCandidates) {
        return {
          rows: [
            { user_id: 4, display_name: 'Ada', handle: 'ada', timezone: 'America/New_York' },
            { user_id: 8, display_name: 'Bea', handle: 'bea', timezone: 'UTC' },
          ],
        };
      }
      if (sql === pushQueries.listTokensForUsers) {
        return { rows: tokens.filter((token) => params[0].map(Number).includes(token.user_id)) };
      }
      throw new Error('unexpected sql');
    });
    const result = await pushService.sendReminders(now);
    expect(result.reminded).toBe(1);
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(deliver.mock.calls[0][0]).toEqual(['ada-token']);
    expect(deliver.mock.calls[0][1].body).toBe("File today's score.");
  });
});
