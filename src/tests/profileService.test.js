jest.mock('../../server/db', () => {
  const query = jest.fn();
  return {
    isDbHealthy: jest.fn(),
    query,
    withTransaction: jest.fn(async (fn) => fn({ query })),
  };
});

const { isDbHealthy, query } = require('../../server/db');
const { userQueries } = require('../../server/queries');
const profileQueries = require('../../server/queries/profileQueries');
const profileService = require('../../server/services/profileService');

const games = [
  { game_id: 2, slug: 'krillion', name: 'Krillion', rank_basis: 'score', sort_order: 2 },
  { game_id: 4, slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', sort_order: 4 },
];

let users;
let scores;
let publications;
let memberships;
let groups;

const fresh = () => {
  users = [
    {
      user_id: 4,
      email: 'will@example.com',
      handle: 'will',
      display_name: 'Will',
      timezone: 'America/New_York',
      portrait_url: null,
      dispatch_mode: 'preview',
      remind_daily: true,
      alert_crown: true,
      alert_new_member: false,
      has_password: true,
    },
    {
      user_id: 8,
      email: 'ada@example.com',
      handle: 'ada',
      display_name: 'Ada',
      timezone: 'UTC',
      portrait_url: null,
      dispatch_mode: 'preview',
      remind_daily: true,
      alert_crown: true,
      alert_new_member: false,
      has_password: true,
    },
  ];
  scores = [
    { score_id: 1, user_id: 4, game_id: 2, puzzle_number: 74, score: 200, guesses: null, solved: true, created_at: '2026-09-01T00:00:00.000Z' },
    { score_id: 2, user_id: 4, game_id: 2, puzzle_number: 75, score: 400, guesses: null, solved: true, created_at: '2026-09-02T00:00:00.000Z' },
    { score_id: 3, user_id: 4, game_id: 4, puzzle_number: 10, score: null, guesses: 2, solved: true, created_at: '2026-09-03T00:00:00.000Z' },
    { score_id: 4, user_id: 4, game_id: 4, puzzle_number: 11, score: null, guesses: 4, solved: true, created_at: '2026-09-04T00:00:00.000Z' },
    { score_id: 5, user_id: 4, game_id: 4, puzzle_number: 12, score: null, guesses: null, solved: false, created_at: '2026-09-05T00:00:00.000Z' },
    { score_id: 9, user_id: 8, game_id: 2, puzzle_number: 74, score: 999, guesses: null, solved: true, created_at: '2026-09-01T00:00:00.000Z' },
  ];
  publications = [
    { score_id: 1, group_id: 10 },
    { score_id: 9, group_id: 10 },
  ];
  memberships = [
    { group_id: 10, user_id: 4, role: 'curator', created_at: '2026-01-01T00:00:00.000Z' },
    { group_id: 10, user_id: 8, role: 'fellow', created_at: '2026-01-02T00:00:00.000Z' },
    { group_id: 12, user_id: 4, role: 'curator', created_at: '2026-01-01T00:00:00.000Z' },
  ];
  groups = [
    { group_id: 10, created_by: 4, name: 'Sunday' },
    { group_id: 12, created_by: 4, name: 'Solo' },
  ];
};

const average = (rows, key) => {
  if (!rows.length) return null;
  return rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
};

const installQuery = () => {
  query.mockImplementation(async (sql, params) => {
    if (sql === userQueries.findById) {
      const user = users.find((row) => row.user_id === params[0]);
      return { rows: user ? [{ ...user }] : [] };
    }
    if (sql === profileQueries.listStats) {
      const mine = scores.filter((row) => row.user_id === params[0]);
      const buckets = new Map();
      for (const score of mine) {
        const game = games.find((row) => row.game_id === score.game_id);
        const bucket = buckets.get(game.game_id) || { ...game, rows: [] };
        bucket.rows.push(score);
        buckets.set(game.game_id, bucket);
      }
      const rows = [...buckets.values()]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((bucket) => {
          const solvedGuesses = bucket.rows.filter((row) => row.solved && row.guesses != null);
          const scored = bucket.rows.filter((row) => row.score != null);
          return {
            slug: bucket.slug,
            name: bucket.name,
            rank_basis: bucket.rank_basis,
            played: bucket.rows.length,
            solved_count: bucket.rows.filter((row) => row.solved).length,
            average_score: average(scored, 'score'),
            average_guesses: average(solvedGuesses, 'guesses'),
            best_score: scored.length ? Math.max(...scored.map((row) => row.score)) : null,
            best_guesses: solvedGuesses.length ? Math.min(...solvedGuesses.map((row) => row.guesses)) : null,
          };
        });
      return { rows };
    }
    if (sql === profileQueries.listExport) {
      const rows = scores
        .filter((row) => row.user_id === params[0])
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.score_id - b.score_id)
        .map((row) => ({
          game: games.find((game) => game.game_id === row.game_id).name,
          puzzle_number: row.puzzle_number,
          score: row.score,
          guesses: row.guesses,
          solved: row.solved,
          created_at: row.created_at,
        }));
      return { rows };
    }
    if (sql === profileQueries.updateProfile) {
      const user = users.find((row) => row.user_id === params[0]);
      if (!user) return { rows: [] };
      const handleTaken = users.some((row) => row.user_id !== user.user_id && row.handle === params[2]);
      if (handleTaken) {
        const err = new Error('duplicate');
        err.code = '23505';
        err.constraint = 'users_handle_key';
        throw err;
      }
      Object.assign(user, {
        display_name: params[1],
        handle: params[2],
        email: params[3],
        portrait_url: params[4],
      });
      return { rows: [{ ...user }] };
    }
    if (sql === profileQueries.updateAlerts) {
      const user = users.find((row) => row.user_id === params[0]);
      if (!user) return { rows: [] };
      Object.assign(user, {
        remind_daily: params[1],
        alert_crown: params[2],
        alert_new_member: params[3],
      });
      return { rows: [{ ...user }] };
    }
    if (sql === profileQueries.deleteOwnPublications) {
      const owned = new Set(scores.filter((row) => row.user_id === params[0]).map((row) => row.score_id));
      publications = publications.filter((row) => !owned.has(row.score_id));
      return { rows: [] };
    }
    if (sql === profileQueries.deleteOwnScores) {
      scores = scores.filter((row) => row.user_id !== params[0]);
      return { rows: [] };
    }
    if (sql === profileQueries.promoteReplacementCurator) {
      const chartered = groups.filter((row) => row.created_by === params[0]).map((row) => row.group_id);
      for (const groupId of chartered) {
        const others = memberships
          .filter((row) => row.group_id === groupId && row.user_id !== params[0])
          .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.user_id - b.user_id);
        const curatorRemains = memberships.some(
          (row) => row.group_id === groupId && row.user_id !== params[0] && row.role === 'curator'
        );
        if (!curatorRemains && others[0]) others[0].role = 'curator';
      }
      return { rows: [] };
    }
    if (sql === profileQueries.reassignCharteredGroups) {
      for (const group of groups.filter((row) => row.created_by === params[0])) {
        const others = memberships
          .filter((row) => row.group_id === group.group_id && row.user_id !== params[0])
          .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)) || a.user_id - b.user_id);
        if (others[0]) group.created_by = others[0].user_id;
      }
      return { rows: [] };
    }
    if (sql === profileQueries.deleteCharteredGroups) {
      const doomed = new Set(groups.filter((row) => row.created_by === params[0]).map((row) => row.group_id));
      groups = groups.filter((row) => !doomed.has(row.group_id));
      memberships = memberships.filter((row) => !doomed.has(row.group_id));
      publications = publications.filter((row) => !doomed.has(row.group_id));
      return { rows: [] };
    }
    if (sql === profileQueries.deleteMemberships) {
      memberships = memberships.filter((row) => row.user_id !== params[0]);
      return { rows: [] };
    }
    if (sql === profileQueries.deleteUser) {
      const user = users.find((row) => row.user_id === params[0]);
      users = users.filter((row) => row.user_id !== params[0]);
      return { rows: user ? [{ user_id: user.user_id }] : [] };
    }
    throw new Error(`unexpected sql: ${String(sql).slice(0, 80)}`);
  });
};

const savedProfile = {
  display_name: 'William',
  handle: 'william',
  email: 'william@example.com',
  portrait_url: '/uploads/portrait.png',
  timezone: 'America/Chicago',
  dispatch_mode: 'auto',
  remind_daily: false,
  alert_crown: true,
  alert_new_member: true,
};

describe('profileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
    fresh();
    installQuery();
  });

  test('returns one stat block per game the caller has played', async () => {
    const payload = await profileService.read(4);
    expect(payload.stats).toEqual([
      { slug: 'krillion', name: 'Krillion', rank_basis: 'score', played: 2, average_score: 300, best_score: 400 },
      {
        slug: 'wordle',
        name: 'Wordle',
        rank_basis: 'guesses',
        played: 3,
        solved_count: 2,
        average_guesses: 3,
        best_guesses: 2,
      },
    ]);
    expect(payload.stats.some((game) => game.slug === 'map-tap')).toBe(false);
    expect(JSON.stringify(payload.stats)).not.toContain('999');
  });

  test('refuses to read or patch another profile', async () => {
    await expect(profileService.read(4, 8)).rejects.toMatchObject({
      status: 403,
      message: 'Not your profile',
    });
    await expect(profileService.update(4, { ...savedProfile, user_id: 8 })).rejects.toMatchObject({
      status: 403,
      message: 'Not your profile',
    });
    await expect(profileService.exportScores(4, 8)).rejects.toMatchObject({ status: 403 });
    expect(users.find((row) => row.user_id === 8).handle).toBe('ada');
    expect(query).not.toHaveBeenCalled();
  });

  test('saves identity and keeps the handle unique', async () => {
    const user = await profileService.update(4, savedProfile);
    expect(user).toMatchObject({
      handle: 'william',
      dispatch_mode: 'preview',
      portrait_url: '/uploads/portrait.png',
    });
    await expect(profileService.update(4, { ...savedProfile, handle: 'ada' })).rejects.toMatchObject({
      status: 409,
      message: 'Handle already in use',
    });
  });

  test('turns the crown alert off', async () => {
    const user = await profileService.updateAlerts(4, {
      remind_daily: true,
      alert_crown: false,
      alert_new_member: false,
    });
    expect(user.alert_crown).toBe(false);
    expect(users.find((row) => row.user_id === 4).alert_crown).toBe(false);
  });

  test('exports only the caller’s scores', async () => {
    const csv = await profileService.exportScores(4);
    expect(csv).toContain('Krillion,74,200,,true');
    expect(csv).toContain('Wordle,10,,2,true');
    expect(csv).not.toContain('999');
    expect(csv).not.toContain('Ada');
  });

  test('delete removes the account and its scores so sign-in cannot find them', async () => {
    await profileService.removeAccount(4);
    expect(scores.filter((row) => row.user_id === 4)).toEqual([]);
    expect(scores.find((row) => row.user_id === 8).score).toBe(999);
    expect(publications.map((row) => row.score_id)).toEqual([9]);
    expect(memberships.filter((row) => row.user_id === 4)).toEqual([]);
    expect(groups.map((row) => row.group_id)).toEqual([10]);
    expect(groups[0].created_by).toBe(8);
    expect(memberships.find((row) => row.user_id === 8).role).toBe('curator');
    expect(users.find((row) => row.handle === 'will' || row.email === 'will@example.com')).toBeUndefined();
    await expect(profileService.read(4)).rejects.toMatchObject({ status: 404, message: 'Account not found' });
  });
});
