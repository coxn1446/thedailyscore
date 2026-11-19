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

const fermi = (overrides) => ({
  group_id: 10,
  slug: 'fermi',
  name: 'Fermi',
  sort_direction: 'lower',
  rank_basis: 'score',
  board: 'daily',
  score_id: 20,
  user_id: 4,
  puzzle_number: 115,
  score: 27.6,
  guesses: null,
  solved: true,
  snippet: '',
  handle: 'will',
  display_name: 'Will',
  logged_today: true,
  logged_this_week: true,
  played_on: '2026-11-18',
  today_on: '2026-11-18',
  game_on: '2026-07-27',
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

  test('ranks a lower Fermi multiple ahead and penalizes a thin week', () => {
    const built = buildStandings([
      fermi(),
      fermi({
        score_id: 21,
        user_id: 8,
        score: 4.2,
        handle: 'ada',
        display_name: 'Ada',
      }),
    ], 4);
    const game = { slug: 'fermi', name: 'Fermi', enabled: true, board: 'daily', rank_basis: 'score' };
    const board = built.board(10, game);
    expect(board.entries.map((entry) => entry.score)).toEqual([4.2, 27.6]);
    expect(board.daily_rank).toBe(2);
    expect(board.weekly_leaderboard.map((entry) => entry.user_id)).toEqual([8, 4]);
    expect(built.standings(10)[0].weekly_best).toBe(27.6);

    const sparse = buildStandings([
      fermi({ score: 10, played_on: '2026-11-18', puzzle_number: 115 }),
      fermi({
        score_id: 22,
        user_id: 8,
        score: 12,
        puzzle_number: 113,
        played_on: '2026-11-16',
        logged_today: false,
        handle: 'ada',
        display_name: 'Ada',
      }),
      fermi({
        score_id: 23,
        user_id: 8,
        score: 12,
        puzzle_number: 114,
        played_on: '2026-11-17',
        logged_today: false,
        handle: 'ada',
        display_name: 'Ada',
      }),
      fermi({
        score_id: 24,
        user_id: 8,
        score: 12,
        puzzle_number: 115,
        played_on: '2026-11-18',
        handle: 'ada',
        display_name: 'Ada',
      }),
    ], 4);
    const week = sparse.board(10, game).weekly_leaderboard;
    expect(week.map((entry) => entry.user_id)).toEqual([8, 4]);
    expect(week[0].average).toBe(12);
    expect(week[1].average).toBe(10);
    expect(week[1].value == null || week[1].weighted > week[0].weighted).toBe(true);
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

  test('shows an unsolved Wordle and summarizes a longer range', () => {
    const missed = buildStandings([
      wordle({ guesses: null, solved: false, logged_today: true, snippet: '⬜⬜⬜⬜⬜' }),
    ], 4);
    const game = { slug: 'wordle', name: 'Wordle', enabled: true, board: 'weekly', rank_basis: 'guesses', min_entries: 4 };
    const today = missed.board(10, game);
    expect(today.daily_entries[0]).toMatchObject({ solved: false, guesses: null, rank: 1, snippet: '⬜⬜⬜⬜⬜' });
    expect(today.weekly_entries[0]).toMatchObject({ layout: 'summary', played: 1, best: null, rank: 1 });
    expect(today.daily_rank).toBe(1);

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
    expect(week.weekly_entries).toHaveLength(2);
    expect(week.weekly_entries[0]).toMatchObject({ user_id: 4, rank: 1, best: 2, played: 4, layout: 'summary' });
    expect(week.weekly_entries[1]).toMatchObject({ user_id: 8, rank: 2, best: 6, played: 4 });
    expect(qualified.standings(10)[0]).toMatchObject({ weekly_rank: 1, weekly_average: 3.5, weekly_played: 4 });
    expect(week.weekly_rank).toBe(1);

    const day = qualified.board(10, game);
    expect(day.daily_entries.map((entry) => entry.guesses)).toEqual([5]);
  });

  test('penalizes a single Wordle against a steadier week and lists one custom day as a score', () => {
    const game = { slug: 'wordle', name: 'Wordle', enabled: true, board: 'weekly', rank_basis: 'guesses', min_entries: 4 };
    const steady = [3, 3, 3, 3].map((guesses, index) => wordle({
      score_id: index + 1,
      puzzle_number: index + 1,
      guesses,
      played_on: `2026-09-${20 + index}`,
    }));
    const flash = wordle({
      score_id: 9,
      user_id: 8,
      puzzle_number: 9,
      guesses: 2,
      handle: 'ada',
      display_name: 'Ada',
      played_on: '2026-09-20',
    });
    const built = buildStandings([...steady, flash], 4);
    const week = built.board(10, game);
    expect(week.weekly_entries.map((entry) => entry.user_id)).toEqual([4, 8]);
    expect(week.weekly_entries[0].average).toBe(3);
    expect(week.weekly_entries[1].played).toBe(1);

    const oneDay = buildStandings([
      wordle({ guesses: null, solved: false, played_on: '2026-09-30' }),
      flash,
    ], 4, { from: '2026-09-30', to: '2026-09-30' });
    const custom = oneDay.board(10, game);
    expect(custom.custom_entries).toHaveLength(1);
    expect(custom.custom_entries[0]).toMatchObject({ solved: false, guesses: null, layout: 'score' });

    const span = buildStandings([...steady, flash], 4, { from: '2026-09-20', to: '2026-09-23' });
    expect(span.board(10, game).custom_entries[0]).toMatchObject({ layout: 'summary', user_id: 4, played: 4 });
  });

  test('ranks a Redactle give-up by the guesses it took', () => {
    const game = {
      slug: 'redactle',
      name: 'Redactle',
      enabled: true,
      board: 'daily',
      rank_basis: 'guesses',
      min_entries: null,
      guess_cap: null,
    };
    const solved = wordle({
      slug: 'redactle',
      name: 'Redactle',
      board: 'daily',
      min_entries: null,
      guess_cap: null,
      guesses: 35,
      solved: true,
      logged_today: true,
      played_on: '2026-11-02',
    });
    const gaveUp = wordle({
      slug: 'redactle',
      name: 'Redactle',
      board: 'daily',
      min_entries: null,
      guess_cap: null,
      score_id: 10,
      user_id: 8,
      guesses: 76,
      solved: false,
      logged_today: true,
      handle: 'ada',
      display_name: 'Ada',
      played_on: '2026-11-02',
    });
    const built = buildStandings([solved, gaveUp], 4);
    const today = built.board(10, game);
    expect(today.guess_cap).toBeNull();
    expect(today.daily_entries.map((entry) => [entry.user_id, entry.guesses, entry.rank])).toEqual([
      [4, 35, 1],
      [8, 76, 2],
    ]);
    expect(today.daily_entries[1].solved).toBe(false);
    const week = built.board(10, game);
    expect(week.weekly_entries.find((entry) => entry.user_id === 8)).toMatchObject({
      average: null,
      gave_up: 1,
      solves: 0,
    });
    expect(week.weekly_entries.find((entry) => entry.user_id === 4).rank).toBe(1);

    const shortQuit = buildStandings([
      wordle({
        slug: 'redactle',
        name: 'Redactle',
        board: 'daily',
        guesses: 40,
        solved: true,
        logged_today: true,
      }),
      wordle({
        slug: 'redactle',
        name: 'Redactle',
        board: 'daily',
        score_id: 11,
        user_id: 8,
        guesses: 10,
        solved: false,
        logged_today: true,
        handle: 'ada',
        display_name: 'Ada',
      }),
    ], 4);
    expect(shortQuit.board(10, game).daily_entries.map((entry) => entry.user_id)).toEqual([4, 8]);
  });

  test('weights a Redactle week by solved days and leaves give-ups out of the average', () => {
    const game = {
      slug: 'redactle',
      name: 'Redactle',
      enabled: true,
      board: 'daily',
      rank_basis: 'guesses',
      guess_cap: null,
    };
    const span = { today_on: '2026-11-08', group_on: '2026-11-02' };
    const steady = [2, 3, 4, 5, 6, 7, 8].map((day, index) => wordle({
      slug: 'redactle',
      name: 'Redactle',
      board: 'daily',
      score_id: index + 1,
      puzzle_number: index + 1,
      guesses: 28,
      solved: true,
      played_on: `2026-11-0${day}`,
      logged_today: day === 8,
      ...span,
    }));
    const partial = [2, 3, 4, 5, 6, 7].map((day, index) => wordle({
      slug: 'redactle',
      name: 'Redactle',
      board: 'daily',
      score_id: 20 + index,
      user_id: 8,
      puzzle_number: index + 1,
      guesses: 30,
      solved: true,
      handle: 'ada',
      display_name: 'Ada',
      played_on: `2026-11-0${day}`,
      logged_today: false,
      ...span,
    }));
    partial.push(wordle({
      slug: 'redactle',
      name: 'Redactle',
      board: 'daily',
      score_id: 30,
      user_id: 8,
      puzzle_number: 7,
      guesses: 80,
      solved: false,
      handle: 'ada',
      display_name: 'Ada',
      played_on: '2026-11-08',
      logged_today: true,
      ...span,
    }));
    const built = buildStandings([...steady, ...partial], 4);
    const board = built.board(10, game);
    const will = board.weekly_leaderboard.find((entry) => entry.user_id === 4);
    const ada = board.weekly_leaderboard.find((entry) => entry.user_id === 8);
    expect(will).toMatchObject({
      average: 28,
      solves: 7,
      possible: 7,
      gave_up: 0,
      weighted: 28,
      rank: 1,
    });
    expect(ada).toMatchObject({
      average: 30,
      solves: 6,
      possible: 7,
      gave_up: 1,
      rank: 2,
    });
    expect(ada.weighted).toBeCloseTo(35, 5);
    expect(board.all_time_leaderboard.find((entry) => entry.user_id === 8).average).toBe(30);
  });

  test('buckets a Redactle all-time share in 25-point steps up to 200%', () => {
    const span = { today_on: '2026-11-08', group_on: '2026-11-02', game_on: '2026-11-02' };
    const steady = [2, 3, 4, 5, 6, 7, 8].map((day, index) => wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: index + 1,
      puzzle_number: index + 1,
      guesses: 28,
      solved: true,
      played_on: `2026-11-0${day}`,
      ...span,
    }));
    const partial = [2, 3, 4, 5, 6].map((day, index) => wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: 20 + index,
      user_id: 8,
      puzzle_number: index + 1,
      guesses: 40,
      solved: true,
      handle: 'ada',
      display_name: 'Ada',
      played_on: `2026-11-0${day}`,
      ...span,
    }));
    partial.push(wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: 30,
      user_id: 8,
      puzzle_number: 6,
      guesses: 10,
      solved: false,
      handle: 'ada',
      display_name: 'Ada',
      played_on: '2026-11-07',
      ...span,
    }));
    const thin = wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: 40,
      user_id: 9,
      puzzle_number: 1,
      guesses: 20,
      solved: true,
      handle: 'bea',
      display_name: 'Bea',
      played_on: '2026-11-02',
      ...span,
    });
    const built = buildStandings([...steady, ...partial, thin], 4);
    const board = built.board(10, {
      slug: 'redactle',
      name: 'Redactle',
      enabled: true,
      board: 'daily',
      rank_basis: 'guesses',
    });
    const will = board.all_time_leaderboard.find((entry) => entry.user_id === 4);
    const ada = board.all_time_leaderboard.find((entry) => entry.user_id === 8);
    const bea = board.all_time_leaderboard.find((entry) => entry.user_id === 9);
    expect(will).toMatchObject({ attempt_percent: 100, solve_percent: 100, weighted: 28 });
    expect(ada).toMatchObject({ attempt_percent: 125, solve_percent: 125, average: 40 });
    expect(ada.weighted).toBeCloseTo(62.5, 5);
    expect(bea).toMatchObject({ attempt_percent: 200, solve_percent: 100, weighted: 40 });
  });

  test('treats a 90% Redactle share as a full record', () => {
    const days = Array.from({ length: 10 }, (_, index) => index + 1);
    const span = { today_on: '2026-11-10', group_on: '2026-11-01', game_on: '2026-11-01' };
    const almost = days.slice(0, 9).map((day) => wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: day,
      puzzle_number: day,
      guesses: 20,
      solved: true,
      played_on: `2026-11-${String(day).padStart(2, '0')}`,
      ...span,
    }));
    const short = days.slice(0, 8).map((day) => wordle({
      slug: 'redactle',
      board: 'daily',
      score_id: 20 + day,
      user_id: 8,
      puzzle_number: day,
      guesses: 20,
      solved: true,
      handle: 'ada',
      display_name: 'Ada',
      played_on: `2026-11-${String(day).padStart(2, '0')}`,
      ...span,
    }));
    const built = buildStandings([...almost, ...short], 4);
    const board = built.board(10, {
      slug: 'redactle',
      name: 'Redactle',
      enabled: true,
      board: 'daily',
      rank_basis: 'guesses',
    });
    expect(board.all_time_leaderboard.find((entry) => entry.user_id === 4)).toMatchObject({
      attempt_percent: 100,
      solve_percent: 100,
      weighted: 20,
    });
    expect(board.all_time_leaderboard.find((entry) => entry.user_id === 8)).toMatchObject({
      attempt_percent: 125,
      solve_percent: 100,
    });
  });

  test('keeps scores from before the game was turned on and ignores the group charter', () => {
    const span = { group_on: '2026-09-01', game_on: '2026-09-08', today_on: '2026-09-10' };
    const played = [8, 9, 10].map((day, index) => krillion({
      score_id: index + 1,
      score: 100,
      puzzle_number: day,
      played_on: `2026-09-${String(day).padStart(2, '0')}`,
      logged_today: false,
      logged_this_week: false,
      ...span,
    }));
    const earlier = krillion({
      score_id: 9,
      score: 400,
      puzzle_number: 1,
      played_on: '2026-09-02',
      logged_today: false,
      logged_this_week: false,
      ...span,
    });
    const built = buildStandings([...played, earlier], 4);
    const board = built.board(10, {
      slug: 'krillion',
      name: 'Krillion',
      enabled: true,
      board: 'daily',
      rank_basis: 'score',
    });
    expect(board.daily_entries).toEqual([]);
    expect(board.all_time_scores).toHaveLength(4);
    expect(board.all_time_leaderboard[0]).toMatchObject({
      user_id: 4,
      played: 4,
      multiplier: 44.4,
    });
  });

  test('shows a Redactle history when nothing was filed today', () => {
    const built = buildStandings([
      wordle({
        slug: 'redactle',
        name: 'Redactle',
        board: 'daily',
        guesses: 26,
        solved: true,
        played_on: '2026-10-21',
        logged_today: false,
        logged_this_week: false,
        game_on: '2026-11-09',
        group_on: '2026-09-01',
        today_on: '2026-11-09',
      }),
      wordle({
        slug: 'redactle',
        name: 'Redactle',
        board: 'daily',
        score_id: 2,
        puzzle_number: 2,
        guesses: 76,
        solved: false,
        played_on: '2026-10-27',
        logged_today: false,
        logged_this_week: false,
        game_on: '2026-11-09',
        group_on: '2026-09-01',
        today_on: '2026-11-09',
      }),
    ], 4);
    const board = built.board(10, {
      slug: 'redactle',
      name: 'Redactle',
      enabled: true,
      board: 'daily',
      rank_basis: 'guesses',
      guess_cap: null,
    });
    expect(board.daily_entries).toEqual([]);
    expect(board.all_time_scores.map((entry) => entry.guesses).sort((a, b) => a - b)).toEqual([26, 76]);
    expect(board.all_time_leaderboard[0]).toMatchObject({
      average: 26,
      solves: 1,
      gave_up: 1,
    });
  });

  test('weights an all-time points average by the share of days played', () => {
    const span = { group_on: '2026-09-01', today_on: '2026-09-10' };
    const steady = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => krillion({
      score_id: day,
      user_id: 8,
      score: 80,
      puzzle_number: day,
      handle: 'ada',
      display_name: 'Ada',
      played_on: `2026-09-${String(day).padStart(2, '0')}`,
      logged_today: day === 10,
      ...span,
    }));
    const thin = [1, 2, 3, 4].map((day) => krillion({
      score_id: 20 + day,
      score: 100,
      puzzle_number: 20 + day,
      played_on: `2026-09-${String(day).padStart(2, '0')}`,
      logged_today: false,
      ...span,
    }));
    const built = buildStandings([...steady, ...thin], 4);
    const board = built.board(10, {
      slug: 'krillion',
      name: 'Krillion',
      enabled: true,
      board: 'daily',
      rank_basis: 'score',
    });
    const ada = board.all_time_leaderboard.find((entry) => entry.user_id === 8);
    const will = board.all_time_leaderboard.find((entry) => entry.user_id === 4);
    expect(ada).toMatchObject({ average: 80, multiplier: 100, weighted: 80, rank: 1 });
    expect(will).toMatchObject({ average: 100, multiplier: 40, weighted: 40, rank: 2 });
    expect(board.all_time_rank).toBe(2);
    expect(board.all_time_weighted).toBe(40);
    expect(board.all_time_scores.map((entry) => entry.score).sort((a, b) => b - a)[0]).toBe(100);
  });

  test('caps a thin Wordle history at the 200% band on the all-time board', () => {
    const span = { group_on: '2026-09-01', today_on: '2026-09-10' };
    const steady = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) => wordle({
      score_id: day,
      puzzle_number: day,
      guesses: 4,
      played_on: `2026-09-${String(day).padStart(2, '0')}`,
      ...span,
    }));
    const flash = wordle({
      score_id: 30,
      user_id: 8,
      puzzle_number: 30,
      guesses: 2,
      handle: 'ada',
      display_name: 'Ada',
      played_on: '2026-09-01',
      ...span,
    });
    const built = buildStandings([...steady, flash], 4);
    const game = {
      slug: 'wordle',
      name: 'Wordle',
      enabled: true,
      board: 'weekly',
      rank_basis: 'guesses',
    };
    const board = built.board(10, game);
    const will = board.all_time_leaderboard.find((entry) => entry.user_id === 4);
    const ada = board.all_time_leaderboard.find((entry) => entry.user_id === 8);
    expect(will).toMatchObject({ average: 4, multiplier: 100, weighted: 4, rank: 1 });
    expect(ada).toMatchObject({ average: 2, multiplier: 200, weighted: 4, rank: 1 });
    expect(board.all_time_scores).toHaveLength(11);

    const longSpan = { group_on: '2026-01-01', today_on: '2026-02-07' };
    const once = buildStandings([
      wordle({
        played_on: '2026-01-01',
        guesses: 3,
        ...longSpan,
      }),
    ], 4);
    const lonely = once.board(10, game).all_time_leaderboard[0];
    expect(lonely).toMatchObject({ played: 1, multiplier: 200, weighted: 6 });
  });
});
