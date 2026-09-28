const { buildDayEntries, buildGazette } = require('../../server/services/scoreService');

const row = (overrides) => ({
  group_id: 10,
  slug: 'krillion',
  game_name: 'Krillion',
  group_name: 'Sunday desk',
  sort_direction: 'higher',
  rank_basis: 'score',
  score_id: 4,
  user_id: 4,
  puzzle_number: 74,
  score: 230,
  guesses: null,
  solved: true,
  snippet: '🦐',
  handle: 'ada',
  display_name: 'Ada',
  updated_at: '2026-09-27T15:00:00.000Z',
  enabled: true,
  logged_today: true,
  ...overrides,
});

describe('day board', () => {
  test('ranks a higher score first and leaves other games off the day', () => {
    const entries = buildDayEntries([
      row({ score: 100, score_id: 5, user_id: 8, display_name: 'Bea', handle: 'bea' }),
      row(),
      row({
        slug: 'wordle',
        game_name: 'Wordle',
        rank_basis: 'guesses',
        sort_direction: 'lower',
        score: null,
        guesses: 3,
        score_id: 9,
        user_id: 4,
        puzzle_number: 100,
      }),
    ], 4, 'krillion');

    expect(entries.map((entry) => entry.score)).toEqual([230, 100]);
    expect(entries[0]).toMatchObject({ rank: 1, snippet: '🦐', puzzle_number: 74, mine: true });
    expect(entries.every((entry) => entry.score != null)).toBe(true);
  });
});

describe('gazette', () => {
  test('keeps one card per result, lists every group, and sorts newest first', () => {
    const cards = buildGazette([
      row({ score: 400, updated_at: '2026-09-27T12:00:00.000Z' }),
      row({
        score_id: 4,
        group_id: 11,
        group_name: 'Monday desk',
        score: 400,
        updated_at: '2026-09-27T12:00:00.000Z',
      }),
      row({
        score_id: 9,
        user_id: 8,
        display_name: 'Bea',
        handle: 'bea',
        slug: 'wordle',
        game_name: 'Wordle',
        rank_basis: 'guesses',
        sort_direction: 'lower',
        score: null,
        guesses: 5,
        puzzle_number: 100,
        snippet: '🟩',
        updated_at: '2026-09-27T18:00:00.000Z',
      }),
    ], 8);

    expect(cards.map((card) => card.score_id)).toEqual([9, 4]);
    expect(cards[1].groups.map((group) => group.name)).toEqual(['Monday desk', 'Sunday desk']);
    expect(cards[1].groups).toHaveLength(2);
    expect(cards[0].name).toBe('Wordle');
    expect(cards[1].name).toBe('Krillion');
  });

  test('hides a disabled game from other members and keeps it for the author', () => {
    const hidden = buildGazette([
      row({ enabled: false, user_id: 4 }),
    ], 8);
    expect(hidden).toEqual([]);

    const own = buildGazette([
      row({ enabled: false, user_id: 4 }),
    ], 4);
    expect(own).toHaveLength(1);
    expect(own[0].groups[0].rank).toBeNull();
  });

  test('leaves yesterday off the gazette', () => {
    expect(buildGazette([row({ logged_today: false })], 4)).toEqual([]);
  });
});
