const { buildStandings } = require('../../server/services/scoreService');

const krillion = (overrides) => ({
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
  ...overrides,
});

const wordle = (overrides) => ({
  group_id: 10,
  slug: 'wordle',
  name: 'Wordle',
  sort_direction: 'lower',
  rank_basis: 'guesses',
  board: 'weekly',
  min_entries: 4,
  score_id: 9,
  user_id: 4,
  puzzle_number: 100,
  score: null,
  guesses: 4,
  solved: true,
  snippet: '',
  handle: 'will',
  display_name: 'Will',
  logged_today: false,
  ...overrides,
});

describe('group standings', () => {
  test('ranks a higher Krillion score ahead today and for the week', () => {
    const built = buildStandings([
      krillion(),
      krillion({
        score_id: 5,
        user_id: 8,
        score: 100,
        handle: 'ada',
        display_name: 'Ada',
      }),
    ], 4);
    const game = { slug: 'krillion', name: 'Krillion', enabled: true, board: 'daily', rank_basis: 'score', min_entries: null };
    const board = built.board(10, game);
    expect(built.scoreCount(10)).toBe(2);
    expect(board.daily_rank).toBe(1);
    expect(board.weekly_rank).toBe(1);
    expect(board.entries.map((entry) => entry.score)).toEqual([230, 100]);
    expect(board.entries[0].mine).toBe(true);
  });

  test('keeps an earlier higher score on the weekly rank and today’s score on the daily board', () => {
    const built = buildStandings([
      krillion({ score: 180, logged_today: true }),
      krillion({ score_id: 3, score: 400, puzzle_number: 70, logged_today: false }),
      krillion({
        score_id: 5,
        user_id: 8,
        score: 250,
        handle: 'ada',
        display_name: 'Ada',
        logged_today: true,
      }),
    ], 4);
    const board = built.board(10, {
      slug: 'krillion',
      name: 'Krillion',
      enabled: true,
      board: 'daily',
      rank_basis: 'score',
    });
    expect(board.entries.map((entry) => entry.score)).toEqual([250, 180]);
    expect(board.daily_rank).toBe(2);
    expect(board.weekly_rank).toBe(1);
    expect(board.weekly_entries.map((entry) => entry.score)).toEqual([400, 250, 180]);
    expect(board.all_time_entries.map((entry) => entry.score)).toEqual([400, 250, 180]);
    expect(board.weekly_score).toBe(580);
    expect(built.standings(10)[0].weekly_average).toBe(290);
    expect(built.standings(10)[0].all_time_average).toBe(290);
    expect(board.all_time_rank).toBe(1);
  });

  test('keeps a custom range on the puzzle day when the database returns a Date', () => {
    const built = buildStandings([
      krillion({ score: 180, played_on: new Date(2026, 8, 27), logged_today: true }),
      krillion({
        score_id: 3,
        score: 400,
        puzzle_number: 70,
        played_on: new Date(2026, 8, 20),
        logged_today: false,
      }),
      krillion({
        score_id: 6,
        score: 90,
        puzzle_number: 71,
        played_on: '2026-09-21',
        logged_today: false,
      }),
    ], 4, { from: '2026-09-20', to: '2026-09-21' });
    const board = built.board(10, {
      slug: 'krillion',
      name: 'Krillion',
      enabled: true,
      board: 'daily',
      rank_basis: 'score',
    });
    expect(board.custom_entries.map((entry) => entry.score)).toEqual([400, 90]);
    expect(board.custom_score).toBe(490);
    expect(built.standings(10)[0].custom_average).toBe(245);
    expect(board.submissions_custom).toBe(2);
  });

  test('leaves an unsolved Wordle and a short week out of the weekly rank', () => {
    const short = buildStandings([
      wordle({ guesses: null, solved: false, logged_today: true }),
      wordle({ score_id: 10, puzzle_number: 101, guesses: 3, logged_today: true }),
      wordle({ score_id: 11, puzzle_number: 102, guesses: 4 }),
    ], 4);
    const game = { slug: 'wordle', name: 'Wordle', enabled: true, board: 'weekly', rank_basis: 'guesses', min_entries: 4 };
    expect(short.board(10, game).weekly_rank).toBeNull();
    expect(short.board(10, game).weekly_entries.map((entry) => entry.guesses)).toEqual([3, 4]);
    expect(short.board(10, game).daily_rank).toBe(1);

    const qualified = buildStandings([
      wordle({ score_id: 1, puzzle_number: 1, guesses: 2 }),
      wordle({ score_id: 2, puzzle_number: 2, guesses: 3 }),
      wordle({ score_id: 3, puzzle_number: 3, guesses: 4 }),
      wordle({ score_id: 4, puzzle_number: 4, guesses: 5, logged_today: true }),
      wordle({ score_id: 5, user_id: 8, puzzle_number: 1, guesses: 6, handle: 'ada', display_name: 'Ada' }),
      wordle({ score_id: 6, user_id: 8, puzzle_number: 2, guesses: 6, handle: 'ada', display_name: 'Ada' }),
      wordle({ score_id: 7, user_id: 8, puzzle_number: 3, guesses: 6, handle: 'ada', display_name: 'Ada' }),
      wordle({ score_id: 8, user_id: 8, puzzle_number: 4, guesses: 6, handle: 'ada', display_name: 'Ada' }),
    ], 4);
    const week = qualified.board(10, game);
    expect(week.weekly_entries[0]).toMatchObject({ user_id: 4, rank: 1, guesses: 2 });
    expect(week.weekly_entries.map((entry) => entry.guesses)).toEqual([2, 3, 4, 5, 6, 6, 6, 6]);
    expect(qualified.standings(10)[0]).toMatchObject({ weekly_rank: 1, weekly_average: 3.5 });
    expect(week.weekly_rank).toBe(1);
  });
});
