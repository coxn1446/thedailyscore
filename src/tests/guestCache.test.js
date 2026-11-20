import { fileGuestScore, guestGameOrder, guestHomeGames, guestNight, guestPastes, guestStats, readGuest, saveGuestGames, setGuestNight } from '../helpers/guestCache';
import { importGuestIntoAccount } from '../helpers/guestImport';

const preview = {
  game: {
    slug: 'krillion',
    name: 'Krillion',
    rank_basis: 'score',
    sort_direction: 'higher',
  },
  puzzle_number: 74,
  score: 355,
  guesses: null,
  solved: true,
  played_on: '2026-11-19',
  snippet: '🐟',
};

describe('guest cache', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url) => {
      const path = String(url);
      if (path.includes('/api/profile/games')) {
        return { ok: true, status: 200, json: async () => ({ games: [{ slug: 'krillion', enabled: true }] }) };
      }
      if (path.includes('/api/profile')) {
        return { ok: true, status: 200, json: async () => ({ user: { user_id: 4, night_mode: true } }) };
      }
      if (path.includes('/api/scores/import')) {
        return { ok: true, status: 200, json: async () => ({ saved: 1, skipped: 0 }) };
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });
  });

  test('stores a score, rejects the same puzzle, and clears after a new account', async () => {
    setGuestNight(true);
    saveGuestGames(['krillion']);
    const saved = fileGuestScore('Krillion #74\n355', preview);
    expect(saved.personal.best_all).toBe(true);
    expect(guestNight()).toBe(true);
    expect(guestStats('all')).toEqual([
      expect.objectContaining({ slug: 'krillion', best_score: 355, played: 1 }),
    ]);
    expect(() => fileGuestScore('Krillion #74\n400', preview)).toThrow("you've already uploaded this score");

    const imported = await importGuestIntoAccount();
    expect(imported).toEqual({ saved: 1, skipped: 0 });
    expect(guestPastes()).toEqual([]);
    expect(readGuest().games).toBeNull();
    const bodies = global.fetch.mock.calls.map((call) => [String(call[0]), call[1]?.method]);
    expect(bodies).toEqual(expect.arrayContaining([
      ['/api/profile/games', 'PUT'],
      ['/api/profile', 'PATCH'],
      ['/api/scores/import', 'POST'],
    ]));
    const pasted = global.fetch.mock.calls.find((call) => String(call[0]).includes('/import'));
    expect(JSON.parse(pasted[1].body).pastes).toEqual(['Krillion #74\n355']);
  });

  test('keeps a guest game order', () => {
    saveGuestGames([
      { slug: 'wordle', name: 'Wordle', enabled: true },
      { slug: 'map-tap', name: 'Map Tap', enabled: true },
    ]);
    expect(guestGameOrder()[0]).toBe('wordle');
    expect(guestHomeGames()[0].slug).toBe('wordle');
  });

  test('leaves the cache in place when the copy fails', async () => {
    fileGuestScore('Krillion #74\n355', preview);
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Could not save' }) });
    await expect(importGuestIntoAccount()).rejects.toThrow('Could not save');
    expect(guestPastes()).toEqual(['Krillion #74\n355']);
  });
});
