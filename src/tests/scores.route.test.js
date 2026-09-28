jest.mock('../../server/services/scoreService', () => ({
  preview: jest.fn(),
  confirm: jest.fn(),
  personalBests: jest.fn(),
  gazette: jest.fn(),
  loggedToday: jest.fn(),
  archive: jest.fn(),
  removeScore: jest.fn(),
  updateShares: jest.fn(),
}));

const scoreService = require('../../server/services/scoreService');
const scoresRouter = require('../../server/routes/scores');

const invoke = (method, url, extra = {}) => {
  const router = scoresRouter();
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      body: extra.body,
      headers: {},
      isAuthenticated: () => extra.authenticated === true,
      user: extra.user || { user_id: 4, suspended: false },
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ status: this.statusCode || 200, body: payload });
        return this;
      },
    };
    router(req, res, (err) => {
      if (err) resolve({ status: err.status || 500, body: { error: err.message } });
      else resolve({ status: res.statusCode || 200, body: res.body });
    });
  });
};

describe('score routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects guests before preview or confirm', async () => {
    const preview = await invoke('POST', '/preview', { body: { paste: 'Wordle 1 1/6' } });
    const posted = await invoke('POST', '/', { body: { paste: 'Wordle 1 1/6' } });
    expect(preview.status).toBe(401);
    expect(posted.status).toBe(401);
    expect(scoreService.preview).not.toHaveBeenCalled();
    expect(scoreService.confirm).not.toHaveBeenCalled();
  });

  test('previews and confirms the raw paste for the signed-in reader', async () => {
    scoreService.preview.mockResolvedValue({ game: { slug: 'krillion' }, puzzle_number: 74 });
    scoreService.confirm.mockResolvedValue({ game: { slug: 'krillion' }, puzzle_number: 74 });

    const preview = await invoke('POST', '/preview', {
      authenticated: true,
      body: { paste: 'Krillion #74 🦐\n355' },
    });
    expect(preview.status).toBe(200);
    expect(scoreService.preview).toHaveBeenCalledWith(4, 'Krillion #74 🦐\n355', expect.any(Date), 'UTC');

    const posted = await invoke('POST', '/', {
      authenticated: true,
      body: { paste: 'Krillion #74 🦐\n355' },
    });
    expect(posted.status).toBe(200);
    expect(scoreService.confirm).toHaveBeenCalledWith(4, 'Krillion #74 🦐\n355', expect.any(Date), undefined, 'UTC');
  });

  test('returns the caller’s best marks', async () => {
    scoreService.personalBests.mockResolvedValue({
      games: [{ slug: 'krillion', name: 'Krillion', best_score: 230, best_guesses: null }],
    });
    const bests = await invoke('GET', '/bests', { authenticated: true });
    expect(bests.status).toBe(200);
    expect(scoreService.personalBests).toHaveBeenCalledWith(4);
    const guest = await invoke('GET', '/bests');
    expect(guest.status).toBe(401);
  });

  test('returns the gazette and today’s count for the caller', async () => {
    scoreService.gazette.mockResolvedValue({ cards: [] });
    scoreService.loggedToday.mockResolvedValue({ count: 2 });

    const gazette = await invoke('GET', '/gazette', { authenticated: true });
    const logged = await invoke('GET', '/logged-today', { authenticated: true });
    expect(gazette.status).toBe(200);
    expect(logged.body.count).toBe(2);
    expect(scoreService.gazette).toHaveBeenCalledWith(4);
    expect(scoreService.loggedToday).toHaveBeenCalledWith(4);

    const guest = await invoke('GET', '/gazette');
    expect(guest.status).toBe(401);
  });

  test('archives, unshares, and deletes only the caller’s score', async () => {
    scoreService.archive.mockResolvedValue({
      scores: [{ score_id: 9, game: { name: 'Krillion' }, score: 210 }],
    });
    scoreService.updateShares.mockResolvedValue({ score_id: 9, groups: [] });
    scoreService.removeScore.mockResolvedValue({ ok: true });

    const listed = await invoke('GET', '/archive', { authenticated: true });
    expect(listed.status).toBe(200);
    expect(scoreService.archive).toHaveBeenCalledWith(4);

    const shared = await invoke('PATCH', '/9/groups', {
      authenticated: true,
      body: { groups: [] },
    });
    expect(shared.status).toBe(200);
    expect(scoreService.updateShares).toHaveBeenCalledWith(4, 9, []);

    const removed = await invoke('DELETE', '/9', { authenticated: true });
    expect(removed.status).toBe(200);
    expect(scoreService.removeScore).toHaveBeenCalledWith(4, 9);

    const guest = await invoke('GET', '/archive');
    expect(guest.status).toBe(401);
  });

  test('returns 400 when the paste is not a result', async () => {
    const err = new Error('Unrecognized result');
    err.status = 400;
    scoreService.preview.mockRejectedValue(err);

    const preview = await invoke('POST', '/preview', {
      authenticated: true,
      body: { paste: 'nope' },
    });
    expect(preview.status).toBe(400);
    expect(preview.body.error).toBe('Unrecognized result');
    expect(scoreService.confirm).not.toHaveBeenCalled();
  });
});
