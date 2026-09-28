import { fetchGazette, fetchLoggedToday, formatResult, postScore, previewScore } from '../helpers/scoreHelpers';

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
      formatResult({ game: { rank_basis: 'guesses' }, guesses: null, solved: false, score: null })
    ).toBe('X/6');
    expect(formatResult({ game: { rank_basis: 'score' }, score: 355, guesses: null, solved: true })).toBe('355');
  });

  test('loads the gazette and today’s count', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchGazette();
    await fetchLoggedToday();
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/scores/gazette', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/scores/logged-today', expect.objectContaining({ credentials: 'include' }));
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
