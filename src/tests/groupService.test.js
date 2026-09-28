jest.mock('../../server/services/pushService', () => ({
  notifyNewMember: jest.fn(() => Promise.resolve({ sent: 0 })),
  notifyCrown: jest.fn(() => Promise.resolve({ sent: 0 })),
}));

jest.mock('../../server/db', () => {
  const query = jest.fn();
  return {
    isDbHealthy: jest.fn(),
    query,
    withTransaction: jest.fn(async (fn) => fn({ query })),
  };
});

const { isDbHealthy, query } = require('../../server/db');
const groupQueries = require('../../server/queries/groupQueries');
const parlorQueries = require('../../server/queries/parlorQueries');
const scoreQueries = require('../../server/queries/scoreQueries');
const groupService = require('../../server/services/groupService');

const catalog = [
  { game_id: 1, slug: 'map-tap', name: 'Map Tap', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 1 },
  { game_id: 2, slug: 'krillion', name: 'Krillion', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 2 },
  { game_id: 3, slug: 'size-it-up', name: 'Size it Up', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 3 },
  { game_id: 4, slug: 'wordle', name: 'Wordle', sort_direction: 'lower', rank_basis: 'guesses', board: 'weekly', min_entries: 4, sort_order: 4 },
];

const curator = { user_id: 4, timezone: 'America/New_York', handle: 'ada_l' };
const fellow = { user_id: 8, timezone: 'America/Chicago', handle: 'alan' };

const baseGroup = {
  group_id: 10,
  name: 'Sunday desk',
  tagline: 'A weekly register',
  timezone: 'America/New_York',
  invite_token: 'invite-token',
  archived: false,
  created_by: 4,
  created_at: '2026-09-27T00:00:00.000Z',
};

describe('groupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
  });

  test('charters Wordle and Krillion on and the other games off', async () => {
    const enabled = new Map();
    const members = [];
    let stored = null;

    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.listGames) return { rows: catalog };
      if (sql === groupQueries.insertGroup) {
        stored = {
          ...baseGroup,
          name: params[0],
          tagline: params[1],
          timezone: params[2],
          invite_token: params[3],
          created_by: params[4],
        };
        return { rows: [stored] };
      }
      if (sql === groupQueries.insertCurator) {
        members.push({
          group_id: params[0],
          user_id: params[1],
          role: 'curator',
          handle: 'ada_l',
          display_name: 'Ada',
        });
        return { rows: [] };
      }
      if (sql === groupQueries.insertGroupGame) {
        enabled.set(params[1], params[2]);
        return { rows: [] };
      }
      if (sql === parlorQueries.insertParlor) return { rows: [{ parlor_id: 1, group_id: params[0] }] };
      if (sql === groupQueries.findGroupById) return { rows: [stored] };
      if (sql === groupQueries.findMember) {
        const row = members.find((member) => member.group_id === params[0] && member.user_id === params[1]);
        return { rows: row ? [row] : [] };
      }
      if (sql === groupQueries.listGroupGames) {
        return { rows: catalog.map((game) => ({ ...game, enabled: enabled.get(game.game_id) })) };
      }
      if (sql === groupQueries.listMembers) return { rows: members };
      throw new Error(`unexpected sql: ${String(sql).slice(0, 80)}`);
    });

    const result = await groupService.charter(curator, {
      name: 'Sunday desk',
      tagline: 'A weekly register',
      timezone: 'UTC',
      games: ['wordle', 'krillion'],
    });

    expect(stored.timezone).toBe('America/New_York');
    expect(result.group.role).toBe('curator');
    expect(result.group.invite_token).toEqual(expect.any(String));
    const on = result.games.filter((game) => game.enabled).map((game) => game.slug);
    expect(on).toEqual(['krillion', 'wordle']);
    expect(result.games.filter((game) => !game.enabled)).toHaveLength(2);
    expect(result.games.find((game) => game.slug === 'krillion').sort_direction).toBe('higher');
    expect(result.games.find((game) => game.slug === 'wordle')).toMatchObject({
      sort_direction: 'lower',
      rank_basis: 'guesses',
      board: 'weekly',
      min_entries: 4,
    });
    expect(query.mock.calls.some(([sql]) => /DELETE\s+FROM\s+group_games/i.test(sql))).toBe(false);
  });

  test('rejects an unknown handle while chartering', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.listGames) return { rows: catalog };
      if (sql === groupQueries.insertGroup) return { rows: [baseGroup] };
      if (sql === groupQueries.insertCurator || sql === groupQueries.insertGroupGame || sql === parlorQueries.insertParlor) {
        return { rows: [] };
      }
      if (sql === groupQueries.findUserByExactHandle) return { rows: [] };
      throw new Error(`unexpected sql ${params}`);
    });

    await expect(
      groupService.charter(curator, { name: 'Sunday desk', handles: '@nobody', games: ['wordle'] })
    ).rejects.toMatchObject({ status: 404, message: 'Unknown handle' });
  });

  test('counts today’s filings and ranks the caller', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.listMine) {
        return {
          rows: [{
            group_id: 10,
            name: 'Sunday desk',
            tagline: null,
            timezone: 'America/New_York',
            archived: false,
            role: 'fellow',
            member_count: 2,
          }],
        };
      }
      if (sql === groupQueries.listGames) return { rows: catalog };
      if (sql === groupQueries.listEnabledGamesForGroups) {
        return { rows: [{ group_id: 10, game_id: 2, slug: 'krillion', name: 'Krillion' }] };
      }
      if (sql === scoreQueries.listWeekRows) {
        return {
          rows: [
            {
              group_id: 10,
              slug: 'krillion',
              name: 'Krillion',
              sort_direction: 'higher',
              rank_basis: 'score',
              board: 'daily',
              min_entries: null,
              score_id: 4,
              user_id: 4,
              puzzle_number: 74,
              score: 230,
              guesses: null,
              solved: true,
              snippet: '',
              handle: 'will',
              display_name: 'Will',
              logged_today: true,
            },
          ],
        };
      }
      if (sql === groupQueries.findGroupById) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === groupQueries.listGroupGames) {
        return { rows: catalog.map((game) => ({ ...game, enabled: game.slug === 'krillion' })) };
      }
      if (sql === groupQueries.listMembers) {
        return { rows: [{ user_id: 4, role: 'fellow', handle: 'will', display_name: 'Will' }] };
      }
      throw new Error(String(sql).slice(0, 40));
    });

    const listed = await groupService.listMine(4);
    expect(listed.groups[0].score_count_today).toBe(1);
    expect(listed.groups[0].standings[0]).toMatchObject({
      slug: 'krillion',
      daily_rank: 1,
      daily_score: 230,
      weekly_rank: 1,
      weekly_score: 230,
      all_time_rank: 1,
      all_time_score: 230,
      submissions_today: 1,
    });

    const detail = await groupService.getGroup(4, 10, 'krillion');
    expect(detail.group.score_count_today).toBe(1);
    expect(detail.board.entries[0]).toMatchObject({ score: 230, rank: 1, mine: true });
    expect(detail.board.daily_rank).toBe(1);
  });

  test('hides a group and its games from a non-member', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findGroupById) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) return { rows: [] };
      if (sql === groupQueries.listGroupGames) throw new Error('games should stay hidden');
      throw new Error('unexpected sql');
    });

    await expect(groupService.getGroup(fellow.user_id, 10)).rejects.toMatchObject({
      status: 403,
      message: 'Not a member',
    });
    await expect(groupService.getDay(fellow.user_id, 10, 'krillion', 0)).rejects.toMatchObject({
      status: 403,
      message: 'Not a member',
    });
  });

  test('returns an empty day for an enabled game and an off board when the game is disabled', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findGroupById) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'fellow' }] };
      if (sql === groupQueries.listGroupGames) {
        return { rows: catalog.map((game) => ({ ...game, enabled: game.slug === 'krillion' })) };
      }
      if (sql === groupQueries.listMembers) {
        return { rows: [{ user_id: 4, role: 'fellow', handle: 'will', display_name: 'Will' }] };
      }
      if (sql === scoreQueries.boardDate) return { rows: [{ board_on: '2026-09-26' }] };
      if (sql === scoreQueries.listDayBoard) return { rows: [] };
      throw new Error(String(sql).slice(0, 80));
    });

    const empty = await groupService.getDay(4, 10, 'krillion', 1);
    expect(empty).toMatchObject({ slug: 'krillion', enabled: true, offset: 1, on: '2026-09-26', entries: [] });

    const off = await groupService.getDay(4, 10, 'wordle', 0);
    expect(off).toMatchObject({ slug: 'wordle', enabled: false, entries: [] });
    expect(query.mock.calls.filter(([sql]) => sql === scoreQueries.listDayBoard)).toHaveLength(1);
  });

  test('stops a fellow from toggling games or archiving', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findGroupForUpdate) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) {
        return { rows: [{ group_id: 10, user_id: 8, role: 'fellow' }] };
      }
      if (
        sql === groupQueries.setGroupGameEnabled
        || sql === groupQueries.archiveGroup
        || sql === groupQueries.unarchiveGroup
        || sql === groupQueries.renameGroup
      ) {
        throw new Error('fellow write');
      }
      throw new Error('unexpected sql');
    });

    await expect(
      groupService.updateGames(fellow, 10, { games: [{ slug: 'wordle', enabled: false }] })
    ).rejects.toMatchObject({ status: 403, message: 'Only a curator can change games' });
    await expect(groupService.archive(fellow, 10)).rejects.toMatchObject({
      status: 403,
      message: 'Only a curator can archive',
    });
    await expect(groupService.unarchive(fellow, 10)).rejects.toMatchObject({
      status: 403,
      message: 'Only a curator can unarchive',
    });
    await expect(groupService.rename(fellow, 10, 'Monday desk')).rejects.toMatchObject({
      status: 403,
      message: 'Only a curator can rename',
    });
  });

  test('disabling a game keeps the join row', async () => {
    const games = catalog.map((game) => ({ ...game, enabled: game.slug === 'wordle' || game.slug === 'krillion' }));
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findGroupForUpdate || sql === groupQueries.findGroupById) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) return { rows: [{ group_id: 10, user_id: 4, role: 'curator' }] };
      if (sql === groupQueries.listGames) return { rows: catalog };
      if (sql === groupQueries.setGroupGameEnabled) {
        const game = games.find((row) => row.game_id === params[1]);
        game.enabled = params[2];
        return { rows: [{ group_id: 10, game_id: params[1], enabled: params[2] }] };
      }
      if (sql === groupQueries.listGroupGames) return { rows: games };
      if (sql === groupQueries.listMembers) {
        return { rows: [{ user_id: 4, role: 'curator', handle: 'ada_l', display_name: 'Ada' }] };
      }
      throw new Error('unexpected sql');
    });

    const result = await groupService.updateGames(curator, 10, {
      games: [{ slug: 'krillion', enabled: false }],
    });
    const krillion = result.games.find((game) => game.slug === 'krillion');
    expect(krillion.enabled).toBe(false);
    expect(result.games).toHaveLength(4);
    expect(query).toHaveBeenCalledWith(groupQueries.setGroupGameEnabled, [10, 2, false]);
    expect(query.mock.calls.some(([sql]) => /DELETE\s+FROM\s+group_games/i.test(sql))).toBe(false);
  });

  test('joins once as a fellow and ignores a second use of the link', async () => {
    const members = [];
    let inserts = 0;
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findGroupByToken) return { rows: [baseGroup] };
      if (sql === groupQueries.findGroupById) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) {
        const row = members.find((member) => member.user_id === params[1]);
        return { rows: row ? [row] : [] };
      }
      if (sql === groupQueries.insertFellow) {
        inserts += 1;
        const row = { group_id: params[0], user_id: params[1], role: 'fellow', handle: 'alan', display_name: 'Alan' };
        members.push(row);
        return { rows: [row] };
      }
      if (sql === groupQueries.listGroupGames) return { rows: catalog.map((game) => ({ ...game, enabled: false })) };
      if (sql === groupQueries.listMembers) return { rows: members };
      throw new Error('unexpected sql');
    });

    const first = await groupService.joinByToken(fellow, 'invite-token');
    const second = await groupService.joinByToken(fellow, 'invite-token');
    expect(first.group.role).toBe('fellow');
    expect(first.group.invite_token).toBeUndefined();
    expect(second.group.role).toBe('fellow');
    expect(inserts).toBe(1);
    expect(members).toHaveLength(1);
  });

  test('rejects a join when the group is archived', async () => {
    query.mockImplementation(async (sql) => {
      if (sql === groupQueries.findGroupByToken) return { rows: [{ ...baseGroup, archived: true }] };
      if (sql === groupQueries.insertFellow) throw new Error('should not join');
      throw new Error('unexpected sql');
    });

    await expect(groupService.joinByToken(fellow, 'invite-token')).rejects.toMatchObject({
      status: 403,
      message: 'Archived groups are not accepting members',
    });
  });

  test('reports an unknown handle and an existing member', async () => {
    const members = [{ group_id: 10, user_id: 8, role: 'fellow' }];
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findGroupForUpdate) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember && params[1] === curator.user_id) {
        return { rows: [{ group_id: 10, user_id: 4, role: 'curator' }] };
      }
      if (sql === groupQueries.findUserByExactHandle) {
        if (params[0] === 'alan') return { rows: [{ user_id: 8, handle: 'alan', display_name: 'Alan' }] };
        return { rows: [] };
      }
      if (sql === groupQueries.findMember) {
        const row = members.find((member) => member.user_id === params[1]);
        return { rows: row ? [row] : [] };
      }
      if (sql === groupQueries.insertFellow) throw new Error('should not insert');
      throw new Error('unexpected sql');
    });

    await expect(groupService.addMember(curator, 10, '@missing')).rejects.toMatchObject({
      status: 404,
      message: 'Unknown handle',
    });
    await expect(groupService.addMember(curator, 10, 'Alan')).rejects.toMatchObject({
      status: 409,
      message: 'Already a member',
    });
  });

  test('stops the last curator from leaving and lets a fellow leave', async () => {
    query.mockImplementation(async (sql, params) => {
      if (sql === groupQueries.findGroupForUpdate) return { rows: [baseGroup] };
      if (sql === groupQueries.findMember) {
        const role = params[1] === 4 ? 'curator' : 'fellow';
        return { rows: [{ group_id: 10, user_id: params[1], role }] };
      }
      if (sql === groupQueries.countCurators) return { rows: [{ curator_count: 1 }] };
      if (sql === groupQueries.deleteMember) return { rows: [{ group_id: 10, user_id: params[1], role: 'fellow' }] };
      throw new Error('unexpected sql');
    });

    await expect(groupService.leave(curator, 10)).rejects.toMatchObject({
      status: 403,
      message: 'The last curator cannot leave',
    });
    await expect(groupService.leave(fellow, 10)).resolves.toEqual({ left: true });
    const deletes = query.mock.calls.filter(([sql]) => sql === groupQueries.deleteMember);
    expect(deletes).toEqual([[groupQueries.deleteMember, [10, 8]]]);
  });
});
