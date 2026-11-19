jest.mock('../../server/services/pushService', () => ({
  notifyCrown: jest.fn(() => Promise.resolve({ sent: 0 })),
  notifyScore: jest.fn(() => Promise.resolve({ sent: 0 })),
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
const scoreQueries = require('../../server/queries/scoreQueries');
const parlorQueries = require('../../server/queries/parlorQueries');
const scoreService = require('../../server/services/scoreService');
const { fixtures } = require('../../server/parsers/fixtures');

const catalog = [
  { game_id: 1, slug: 'map-tap', name: 'Map Tap', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 1 },
  { game_id: 2, slug: 'krillion', name: 'Krillion', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 2 },
  { game_id: 3, slug: 'size-it-up', name: 'Size it Up', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 3 },
  { game_id: 4, slug: 'wordle', name: 'Wordle', sort_direction: 'lower', rank_basis: 'guesses', board: 'weekly', min_entries: 4, guess_cap: 6, sort_order: 4 },
  { game_id: 5, slug: 'redactle', name: 'Redactle', sort_direction: 'lower', rank_basis: 'guesses', board: 'daily', min_entries: null, guess_cap: null, sort_order: 5 },
  { game_id: 7, slug: 'semantle', name: 'Semantle', sort_direction: 'lower', rank_basis: 'guesses', board: 'daily', min_entries: null, guess_cap: null, sort_order: 7 },
  { game_id: 10, slug: 'fermi', name: 'Fermi', sort_direction: 'lower', rank_basis: 'score', board: 'daily', min_entries: null, guess_cap: null, sort_order: 10 },
  { game_id: 11, slug: 'hivemind', name: 'Hivemind', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, guess_cap: null, sort_order: 11 },
  { game_id: 12, slug: 'noillirk', name: 'Noillirk', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, guess_cap: null, sort_order: 12 },
];

const groups = [
  { group_id: 10, name: 'Sunday desk', timezone: 'America/New_York', archived: false },
  { group_id: 11, name: 'Monday desk', timezone: 'America/Chicago', archived: false },
  { group_id: 12, name: 'Quiet desk', timezone: 'America/New_York', archived: false },
  { group_id: 13, name: 'Closed desk', timezone: 'UTC', archived: true },
];

const memberships = [
  { group_id: 10, user_id: 4 },
  { group_id: 11, user_id: 4 },
  { group_id: 12, user_id: 4 },
  { group_id: 13, user_id: 4 },
  { group_id: 10, user_id: 8 },
];

const enabled = {
  10: new Set(['krillion', 'wordle', 'map-tap', 'size-it-up', 'redactle', 'semantle']),
  11: new Set(['krillion', 'wordle']),
  12: new Set(['wordle']),
  13: new Set(['krillion', 'wordle']),
};

const krillion = fixtures.find((fixture) => fixture.slug === 'krillion');
const wordle = fixtures.find((fixture) => fixture.slug === 'wordle');

let scores;
let publications;
let nextId;

const installQuery = () => {
  query.mockImplementation(async (sql, params) => {
    if (sql === scoreQueries.findGameBySlug) {
      const game = catalog.find((row) => row.slug === params[0]);
      return { rows: game ? [game] : [] };
    }
    if (sql === scoreQueries.listDestinations) {
      const [userId, slug] = params;
      const rows = groups.filter((group) => {
        if (group.archived) return false;
        const member = memberships.some((row) => row.group_id === group.group_id && row.user_id === userId);
        return member && enabled[group.group_id].has(slug);
      });
      rows.sort((a, b) => a.name.localeCompare(b.name) || a.group_id - b.group_id);
      return { rows };
    }
    if (sql === scoreQueries.upsertScore) {
      const [userId, gameId, puzzleNumber, rawPaste, snippet, score, guesses, solved, playedOn, durationSeconds, hints] = params;
      const existing = scores.find(
        (row) => row.user_id === userId && row.game_id === gameId && row.puzzle_number === puzzleNumber
      );
      if (existing) return { rows: [] };
      const created = {
        score_id: nextId,
        user_id: userId,
        game_id: gameId,
        puzzle_number: puzzleNumber,
        raw_paste: rawPaste,
        snippet,
        score,
        guesses,
        solved,
        played_on: playedOn,
        duration_seconds: durationSeconds ?? null,
        hints: hints ?? null,
      };
      nextId += 1;
      scores.push(created);
      return { rows: [created] };
    }
    if (sql === parlorQueries.todayFilings) return { rows: [] };
    if (sql === scoreQueries.listUserGameScores) {
      const [userId, gameId] = params;
      return {
        rows: scores
          .filter((row) => row.user_id === userId && row.game_id === gameId)
          .map((row) => ({
            score_id: row.score_id,
            played_on: row.played_on,
            score: row.score,
            guesses: row.guesses,
            solved: row.solved,
            puzzle_number: row.puzzle_number,
          })),
      };
    }
    if (sql === scoreQueries.deletePublications) {
      publications = publications.filter((row) => row.score_id !== params[0]);
      return { rows: [] };
    }
    if (sql === scoreQueries.setScoreImage) {
      const score = scores.find((row) => row.score_id === params[0] && row.user_id === params[1]);
      if (!score) return { rows: [] };
      score.image_url = params[2];
      return { rows: [{ image_url: params[2] }] };
    }
    if (sql === scoreQueries.insertPublication) {
      publications.push({ score_id: params[0], group_id: params[1] });
      return { rows: [] };
    }
    if (sql === scoreQueries.listDailyBoard) {
      const [gameId, groupIds] = params;
      const rows = [];
      for (const pub of publications) {
        if (!groupIds.includes(pub.group_id)) continue;
        const score = scores.find((row) => row.score_id === pub.score_id);
        if (!score || score.game_id !== gameId || score.score == null) continue;
        rows.push({
          score_id: score.score_id,
          user_id: score.user_id,
          group_id: pub.group_id,
          value: score.score,
        });
      }
      return { rows };
    }
    if (sql === scoreQueries.listGlobalRows) return { rows: [] };
    if (sql === scoreQueries.listPuzzleBoard) {
      const [gameId, puzzleNumber, groupIds] = params;
      const rows = [];
      for (const pub of publications) {
        if (!groupIds.includes(pub.group_id)) continue;
        const score = scores.find((row) => row.score_id === pub.score_id);
        if (!score || score.game_id !== gameId || score.puzzle_number !== puzzleNumber) continue;
        rows.push({
          score_id: score.score_id,
          user_id: score.user_id,
          group_id: pub.group_id,
          value: score.solved === false && score.guesses != null ? 10000 : (score.guesses != null ? score.guesses : 7),
        });
      }
      return { rows };
    }
    throw new Error(`unexpected sql: ${String(sql).slice(0, 80)}`);
  });
};

describe('scoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
    scores = [];
    publications = [];
    nextId = 1;
    installQuery();
  });

  test('previews Krillion for enabled groups and writes nothing', async () => {
    const preview = await scoreService.preview(4, krillion.paste, krillion.now);
    expect(preview.game.slug).toBe('krillion');
    expect(preview.puzzle_number).toBe(74);
    expect(preview.score).toBe(355);
    expect(preview.groups.map((group) => group.name)).toEqual(['Monday desk', 'Sunday desk']);
    expect(scores).toHaveLength(0);
    expect(publications).toHaveLength(0);
  });

  test('previews a Fermi multiple', async () => {
    const fermi = fixtures.find((fixture) => fixture.slug === 'fermi');
    const preview = await scoreService.preview(4, fermi.paste, fermi.now);
    expect(preview.game).toMatchObject({ slug: 'fermi', sort_direction: 'lower', rank_basis: 'score' });
    const hivemind = fixtures.find((fixture) => fixture.slug === 'hivemind');
    const hive = await scoreService.preview(4, hivemind.paste, hivemind.now);
    expect(hive.game).toMatchObject({ slug: 'hivemind', sort_direction: 'higher', rank_basis: 'score' });
    expect(hive.score).toBe(434);
    expect(hive.puzzle_number).toBe(24);
    const noillirk = fixtures.find((fixture) => fixture.slug === 'noillirk');
    const climb = await scoreService.preview(4, noillirk.paste, noillirk.now);
    expect(climb.game).toMatchObject({ slug: 'noillirk', sort_direction: 'higher', rank_basis: 'score' });
    expect(climb.score).toBe(1922);
    expect(climb.snippet).toBe('THE LOW CLOUDS\n⬛🟨⬛⬛🟨⬛🟨');
    expect(preview.puzzle_number).toBe(115);
    expect(preview.score).toBe(27.6);
    expect(scores).toHaveLength(0);
  });

  test('publishes to both Krillion groups and ranks a higher score ahead', async () => {
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now);
    expect(posted.personal).toEqual({ best_week: true, best_all: true });
    expect(posted.groups).toEqual([
      { group_id: 11, name: 'Monday desk', rank: 1 },
      { group_id: 10, name: 'Sunday desk', rank: 1 },
    ]);
    expect(publications.map((row) => row.group_id).sort()).toEqual([10, 11]);
    expect(scores).toHaveLength(1);

    const lower = await scoreService.confirm(8, 'Krillion #74 🦐\n200\n', krillion.now);
    expect(lower.groups).toEqual([{ group_id: 10, name: 'Sunday desk', rank: 2 }]);
    expect(scores.find((row) => row.user_id === 4).score).toBe(355);
    expect(scores.find((row) => row.user_id === 8).score).toBe(200);
    expect(publications.filter((row) => row.group_id === 12)).toHaveLength(0);
    expect(publications.filter((row) => row.group_id === 13)).toHaveLength(0);
  });

  test('rejects a second upload of the same puzzle and keeps the first score', async () => {
    await scoreService.confirm(4, krillion.paste, krillion.now);
    await scoreService.confirm(8, 'Krillion #74 🦐\n400\n', krillion.now);
    await expect(scoreService.confirm(4, 'Krillion #74 🦐\n500\n', krillion.now)).rejects.toMatchObject({
      status: 409,
      message: "you've already uploaded this score",
    });
    expect(scores.find((row) => row.user_id === 4).score).toBe(355);
    expect(scores.find((row) => row.user_id === 8).score).toBe(400);

    const earlier = await scoreService.confirm(4, 'Krillion #73 🦐\n120\n', krillion.now);
    expect(earlier.personal).toEqual({ best_week: false, best_all: false });
    expect(earlier.puzzle_number).toBe(73);
    expect(earlier.score).toBe(120);
    expect(scores.filter((row) => row.user_id === 4)).toHaveLength(2);
  });

  test('saves an unsolved Wordle and ranks it behind a solve', async () => {
    const missed = await scoreService.confirm(4, 'Wordle 1,234 X/6\n\n⬛⬛⬛⬛⬛', wordle.now);
    expect(missed.guesses).toBeNull();
    expect(missed.score).toBeNull();
    expect(missed.solved).toBe(false);
    expect(missed.personal).toEqual({ best_week: false, best_all: false });
    expect(missed.groups.every((group) => group.rank === 1)).toBe(true);
    const stored = scores.find((row) => row.user_id === 4);
    expect(stored).toMatchObject({ guesses: null, score: null, solved: false });

    const solved = await scoreService.confirm(8, 'Wordle 1234 2/6\n\n🟩🟩🟩🟩🟩', wordle.now);
    expect(solved.groups).toEqual([{ group_id: 10, name: 'Sunday desk', rank: 1 }]);
    expect(scores.find((row) => row.user_id === 4).guesses).toBeNull();

    await expect(scoreService.confirm(4, wordle.paste, wordle.now)).rejects.toMatchObject({
      status: 409,
      message: "you've already uploaded this score",
    });
    expect(scores.find((row) => row.user_id === 4).guesses).toBeNull();
    expect(scores.filter((row) => row.user_id === 4)).toHaveLength(1);
    expect(scores.find((row) => row.user_id === 8).guesses).toBe(2);
  });

  test('saves a Redactle solve and ranks a give-up by its guess count', async () => {
    const cracked = [
      'I cracked Redactle #1671 in 35 guesses!',
      '🎲 35 | 🔥 3 | Avg 28.15 | Hints: none | ⏱️ 5m19s',
    ].join('\n');
    const gaveUp = [
      'I gave up on Redactle #1671 after 76 guesses.',
      '🎲 76 | 🔥 9 | Avg 38.38 | Hints👆3, 💬1 | ⏱️ 16m16s',
    ].join('\n');
    const posted = await scoreService.confirm(4, cracked, new Date('2026-11-02T15:00:00.000Z'));
    expect(posted).toMatchObject({
      puzzle_number: 1671,
      score: null,
      guesses: 35,
      solved: true,
      duration_seconds: 319,
      hints: 0,
    });
    expect(posted.game.guess_cap).toBeNull();
    expect(scores[0]).toMatchObject({ guesses: 35, duration_seconds: 319, hints: 0, solved: true });

    const missed = await scoreService.confirm(8, gaveUp, new Date('2026-11-02T15:00:00.000Z'));
    expect(missed).toMatchObject({ guesses: 76, solved: false, duration_seconds: 976, hints: 4 });
    expect(missed.groups).toEqual([{ group_id: 10, name: 'Sunday desk', rank: 2 }]);
    expect(posted.groups[0].rank).toBe(1);
  });

  test('previews a Semantle share that has guesses and no time', async () => {
    const paste = [
      'Semantle #1752',
      '✅ 86 Guesses',
      '🔝 Guess #86',
      '🥈 0/1000',
      '💡 0 Hints',
      'semantle.com',
    ].join('\n');
    const preview = await scoreService.preview(4, paste, new Date('2026-11-16T15:00:00.000Z'));
    expect(preview).toMatchObject({
      puzzle_number: 1752,
      score: null,
      guesses: 86,
      solved: true,
      duration_seconds: null,
      hints: 0,
    });
    expect(preview.game.slug).toBe('semantle');
    expect(preview.game.guess_cap).toBeNull();
    expect(scores).toHaveLength(0);
  });

  test('skips publication when no groups are selected', async () => {
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now, []);
    expect(posted.groups).toEqual([]);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(355);
    expect(publications).toHaveLength(0);
  });

  test('publishes only the groups that were checked', async () => {
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now, [10]);
    expect(posted.groups.map((group) => group.group_id)).toEqual([10]);
    expect(publications.map((row) => row.group_id)).toEqual([10]);
  });

  test('rejects nonsense and an empty paste without writing', async () => {
    await expect(scoreService.preview(4, 'hello desk')).rejects.toMatchObject({
      status: 400,
      message: 'Unrecognized result',
    });
    await expect(scoreService.confirm(4, '   ')).rejects.toMatchObject({
      status: 400,
      message: 'Paste a result',
    });
    expect(scores).toHaveLength(0);
    expect(query).not.toHaveBeenCalled();
  });

  test('stores an uploaded picture and rejects any other address', async () => {
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now, [], 'UTC', '/uploads/desk.png');
    expect(posted.image_url).toBe('/uploads/desk.png');
    expect(posted.score_id).toBe(1);
    expect(scores[0].image_url).toBe('/uploads/desk.png');
    await expect(
      scoreService.confirm(8, 'Krillion #74 🦐\n200\n', krillion.now, [], 'UTC', 'https://evil.example/pic.png')
    ).rejects.toMatchObject({ status: 400, message: 'Picture is not valid' });
    expect(scores).toHaveLength(1);
  });

  test('still saves a personal score when no group tracks the game', async () => {
    enabled[10].delete('krillion');
    enabled[11].delete('krillion');
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now);
    expect(posted.groups).toEqual([]);
    expect(scores).toHaveLength(1);
    expect(scores[0].score).toBe(355);
    expect(publications).toHaveLength(0);
    enabled[10].add('krillion');
    enabled[11].add('krillion');
  });

  test('ranks an unpublished score on the global board from the game epoch', async () => {
    const rows = [
      {
        group_id: 0,
        slug: 'map-tap',
        name: 'Map Tap',
        sort_direction: 'higher',
        rank_basis: 'score',
        guess_cap: null,
        board: 'daily',
        min_entries: null,
        score_id: 1,
        user_id: 4,
        puzzle_number: 2,
        score: 300,
        guesses: null,
        solved: true,
        snippet: '',
        handle: 'ada',
        display_name: 'Ada',
        portrait_url: null,
        played_on: '2024-06-23',
        updated_at: '2024-06-23T12:00:00.000Z',
        today_on: '2024-06-23',
        game_on: '2024-06-21',
        group_on: '2024-06-21',
        logged_today: true,
        logged_this_week: true,
      },
      {
        group_id: 0,
        slug: 'map-tap',
        name: 'Map Tap',
        sort_direction: 'higher',
        rank_basis: 'score',
        guess_cap: null,
        board: 'daily',
        min_entries: null,
        score_id: 2,
        user_id: 8,
        puzzle_number: 0,
        score: 100,
        guesses: null,
        solved: true,
        snippet: '',
        handle: 'bea',
        display_name: 'Bea',
        portrait_url: null,
        played_on: '2024-06-21',
        updated_at: '2024-06-21T12:00:00.000Z',
        today_on: '2024-06-23',
        game_on: '2024-06-21',
        group_on: '2024-06-21',
        logged_today: false,
        logged_this_week: true,
      },
      {
        group_id: 0,
        slug: 'map-tap',
        name: 'Map Tap',
        sort_direction: 'higher',
        rank_basis: 'score',
        guess_cap: null,
        board: 'daily',
        min_entries: null,
        score_id: 3,
        user_id: 8,
        puzzle_number: 1,
        score: 100,
        guesses: null,
        solved: true,
        snippet: '',
        handle: 'bea',
        display_name: 'Bea',
        portrait_url: null,
        played_on: '2024-06-22',
        updated_at: '2024-06-22T12:00:00.000Z',
        today_on: '2024-06-23',
        game_on: '2024-06-21',
        group_on: '2024-06-21',
        logged_today: false,
        logged_this_week: true,
      },
      {
        group_id: 0,
        slug: 'map-tap',
        name: 'Map Tap',
        sort_direction: 'higher',
        rank_basis: 'score',
        guess_cap: null,
        board: 'daily',
        min_entries: null,
        score_id: 4,
        user_id: 8,
        puzzle_number: 2,
        score: 100,
        guesses: null,
        solved: true,
        snippet: '',
        handle: 'bea',
        display_name: 'Bea',
        portrait_url: null,
        played_on: '2024-06-23',
        updated_at: '2024-06-23T12:00:00.000Z',
        today_on: '2024-06-23',
        game_on: '2024-06-21',
        group_on: '2024-06-21',
        logged_today: true,
        logged_this_week: true,
      },
      {
        group_id: 0,
        slug: 'map-tap',
        name: 'Map Tap',
        sort_direction: 'higher',
        rank_basis: 'score',
        guess_cap: null,
        board: 'daily',
        min_entries: null,
        score_id: 9,
        user_id: 9,
        puzzle_number: 2,
        score: 50,
        guesses: null,
        solved: true,
        snippet: '',
        handle: 'cy',
        display_name: 'Cy',
        portrait_url: null,
        played_on: '2024-06-23',
        updated_at: '2024-06-23T12:00:00.000Z',
        today_on: '2024-06-23',
        game_on: '2024-06-21',
        group_on: '2024-06-21',
        logged_today: true,
        logged_this_week: true,
      },
    ];
    query.mockImplementation(async (sql, params) => {
      if (sql !== scoreQueries.listGlobalRows && sql !== require('../../server/queries/profileQueries').listUserGames) {
        throw new Error('unexpected sql');
      }
      if (sql !== scoreQueries.listGlobalRows) return { rows: [] };
      const ids = params[1];
      return { rows: rows.filter((row) => !ids || ids.map(Number).includes(Number(row.user_id))) };
    });

    const standings = await scoreService.globalBoard(4, 'Not/AZone', null, null);
    expect(query).toHaveBeenCalledWith(scoreQueries.listGlobalRows, ['UTC', null]);
    const mine = standings.standings(0).find((row) => row.slug === 'map-tap');
    expect(mine.all_time_multiplier).toBe(33.3);
    const game = { slug: 'map-tap', name: 'Map Tap', enabled: true, rank_basis: 'score', board: 'daily' };
    const full = standings.board(0, game);
    expect(full.daily_entries.map((entry) => entry.user_id)).toEqual(expect.arrayContaining([4]));
    expect(full.all_time_leaderboard.find((entry) => entry.user_id === 8).multiplier).toBe(100);

    const friends = await scoreService.globalBoard(4, 'UTC', [4, 8], null);
    expect(query).toHaveBeenCalledWith(scoreQueries.listGlobalRows, ['UTC', [4, 8]]);
    const friendBoard = friends.board(0, game);
    expect(friendBoard.daily_entries.map((entry) => entry.user_id)).not.toContain(9);

    const card = await scoreService.recap(4, 'UTC', 'today');
    expect(card.games).toEqual([
      expect.objectContaining({ slug: 'map-tap', name: 'Map Tap', line: '300' }),
    ]);
    expect(card.games[0].line).toContain('300');
  });
});
