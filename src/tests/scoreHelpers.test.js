import { fetchGazette, fetchLoggedToday, fetchTodayScores, formatResult, formatScore, formatTodayCopy, postScore, previewScore, weightExplanation } from '../helpers/scoreHelpers';

describe('scoreHelpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('posts the raw paste to preview and confirm', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ puzzle_number: 74 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ puzzle_number: 74 }),
      });

    await previewScore('Krillion #74');
    await postScore('Krillion #74');

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/scores/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paste: 'Krillion #74' }),
      })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/scores',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ paste: 'Krillion #74' }),
      })
    );
  });

  test('formats guesses for Wordle and a points score for the other games', () => {
    expect(
      formatResult({ game: { rank_basis: 'guesses' }, guesses: 3, solved: true, score: null })
    ).toBe('3/6');
    expect(
      formatResult({ game: { rank_basis: 'guesses', guess_cap: null }, guesses: 35, solved: true, score: null })
    ).toBe('35');
    expect(
      formatResult({ game: { rank_basis: 'guesses', guess_cap: null }, guesses: 76, solved: false, score: null })
    ).toBe('76');
    expect(
      formatResult({ game: { rank_basis: 'guesses' }, guesses: null, solved: false, score: null })
    ).toBe('X/6');
    expect(formatResult({ game: { rank_basis: 'score' }, score: 355, guesses: null, solved: true })).toBe('355');
    expect(formatResult({ game: { slug: 'noillirk', rank_basis: 'score' }, score: 1922, solved: true })).toBe('1922m');
    expect(formatScore(27.6)).toBe('27.6');
    expect(formatScore(1.94)).toBe('1.94');
    expect(formatScore('1.90')).toBe('1.9');
  });

  test('explains each game’s weighted average', () => {
    expect(weightExplanation({ slug: 'redactle' }, {
      average: 30,
      solves: 6,
      gave_up: 1,
      possible: 7,
    })).toBe('Average of solved puzzles (30) * attempt percentage (100.0%) * solve percentage (116.7%)');
    expect(weightExplanation({ slug: 'redactle' }, {
      average: 28,
      solves: 6,
      gave_up: 0,
      possible: 7,
    })).toBe('Average of solved puzzles (28) * attempt percentage (116.7%) * solve percentage (100.0%)');
    expect(weightExplanation({ slug: 'wordle', rank_basis: 'guesses' })).toContain('miss counts as 7');
    expect(weightExplanation({ slug: 'fermi', rank_basis: 'score' })).toContain('Lower is better');
    expect(weightExplanation({ slug: 'krillion', rank_basis: 'score' })).toContain('since this game was turned on');
  });

  test('copies today’s scores with the site link and the game marks', () => {
    expect(formatTodayCopy({
      on: '2026-09-30',
      scores: [
        { slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', guesses: null, solved: false, score: null, snippet: '⬛⬛⬛⬛⬛' },
        {
          slug: 'krillion',
          name: 'Krillion',
          rank_basis: 'score',
          score: 355,
          solved: true,
          snippet: '🏮🐟🐟🐟🫧⬛🫧',
        },
        {
          slug: 'map-tap',
          name: 'Map Tap',
          rank_basis: 'score',
          score: 956,
          solved: true,
          snippet: '96🔥 96🔥 100🎯 93🏆 95🏅',
        },
        {
          slug: 'time-guesser',
          name: 'Time Guesser',
          rank_basis: 'score',
          score: 21347,
          solved: true,
          snippet: '1️⃣ 🏆3,975 · 📅 20y · 🌍 761.4mi',
        },
        {
          slug: 'farflung',
          name: 'Farflung',
          rank_basis: 'score',
          score: 125,
          solved: true,
          snippet: 'Uncommon · Miss · Miss · Rare · Miss',
        },
        {
          slug: 'eraly',
          name: 'Eraly',
          rank_basis: 'score',
          score: 470,
          solved: true,
          snippet: '▰▰▰▰▰▰▰▱▱▱ 470/700\n🟨🟩🟧🟩🟨🟩🟩',
        },
        {
          slug: 'fermi',
          name: 'Fermi',
          rank_basis: 'score',
          score: 27.6,
          solved: true,
          snippet: '01 ↓ 2.80×\n02 ↓ 7.53×\n03 ↑ 16,667×\n─────────',
        },
        {
          slug: 'hivemind',
          name: 'Hivemind',
          rank_basis: 'score',
          score: 434,
          solved: true,
          snippet: '⬡⬛🍯🟨🔍\nForager',
        },
        {
          slug: 'noillirk',
          name: 'Noillirk',
          rank_basis: 'score',
          score: 1922,
          solved: true,
          snippet: 'THE LOW CLOUDS\n⬛🟨⬛⬛🟨⬛🟨',
        },
      ],
    })).toBe([
      'The Daily Score | Sep 30, 2026',
      'Wordle\nX/6',
      'Krillion\n🏮🐟🐟🐟🫧⬛🫧\n355',
      'Map Tap\n96🔥 96🔥 100🎯 93🏆 95🏅\n956',
      'Time Guesser\n1️⃣ 🏆3,975 · 📅 20y · 🌍 761.4mi\n21347',
      'Farflung\nUncommon · Miss · Miss · Rare · Miss\n125',
      'Eraly\n▰▰▰▰▰▰▰▱▱▱ 470/700\n🟨🟩🟧🟩🟨🟩🟩\n470',
      'Fermi\n01 ↓ 2.80×\n02 ↓ 7.53×\n03 ↑ 16,667×\n─────────\n27.6',
      'Hivemind\n⬡⬛🍯🟨🔍\nForager\n434',
      'Noillirk\nTHE LOW CLOUDS\n⬛🟨⬛⬛🟨⬛🟨\n1922m',
      '.https://thedailyscore.site.',
    ].join('\n\n'));
    expect(formatTodayCopy({
      on: '2026-09-30',
      scores: [{
        slug: 'krillion',
        name: 'Krillion',
        rank_basis: 'score',
        score: 10,
        solved: true,
        snippet: 'https://krillion.io',
      }],
    })).toContain('.https://krillion.io.');
  });

  test('loads the gazette and today’s count', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchGazette();
    await fetchLoggedToday();
    await fetchTodayScores();
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/scores/gazette', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/scores/logged-today', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/scores/today', expect.objectContaining({ credentials: 'include' }));
  });

  test('surfaces the server error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Unrecognized result' }),
    });
    await expect(previewScore('nope')).rejects.toThrow('Unrecognized result');
  });
});
