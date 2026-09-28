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
const scoreService = require('../../server/services/scoreService');
const { fixtures } = require('../../server/parsers/fixtures');

const catalog = [
  { game_id: 1, slug: 'map-tap', name: 'Map Tap', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 1 },
  { game_id: 2, slug: 'krillion', name: 'Krillion', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 2 },
  { game_id: 3, slug: 'size-it-up', name: 'Size it Up', sort_direction: 'higher', rank_basis: 'score', board: 'daily', min_entries: null, sort_order: 3 },
  { game_id: 4, slug: 'wordle', name: 'Wordle', sort_direction: 'lower', rank_basis: 'guesses', board: 'weekly', min_entries: 4, sort_order: 4 },
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
  10: new Set(['krillion', 'wordle', 'map-tap', 'size-it-up']),
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
      const [userId, gameId, puzzleNumber, rawPaste, snippet, score, guesses, solved] = params;
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
      };
      nextId += 1;
      scores.push(created);
      return { rows: [created] };
    }
    if (sql === scoreQueries.deletePublications) {
      publications = publications.filter((row) => row.score_id !== params[0]);
      return { rows: [] };
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
    if (sql === scoreQueries.listPuzzleBoard) {
      const [gameId, puzzleNumber, groupIds] = params;
      const rows = [];
      for (const pub of publications) {
        if (!groupIds.includes(pub.group_id)) continue;
        const score = scores.find((row) => row.score_id === pub.score_id);
        if (!score || score.game_id !== gameId || score.puzzle_number !== puzzleNumber) continue;
        if (!score.solved || score.guesses == null) continue;
        rows.push({
          score_id: score.score_id,
          user_id: score.user_id,
          group_id: pub.group_id,
          value: score.guesses,
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

  test('publishes to both Krillion groups and ranks a higher score ahead', async () => {
    const posted = await scoreService.confirm(4, krillion.paste, krillion.now);
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
    expect(earlier.puzzle_number).toBe(73);
    expect(earlier.score).toBe(120);
    expect(scores.filter((row) => row.user_id === 4)).toHaveLength(2);
  });

  test('saves an unsolved Wordle and leaves it out of the rank', async () => {
    const missed = await scoreService.confirm(4, 'Wordle 1,234 X/6\n\n⬛⬛⬛⬛⬛', wordle.now);
    expect(missed.guesses).toBeNull();
    expect(missed.score).toBeNull();
    expect(missed.solved).toBe(false);
    expect(missed.groups.every((group) => group.rank == null)).toBe(true);
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
});
