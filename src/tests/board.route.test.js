jest.mock('../../server/services/boardService', () => ({
  board: jest.fn(),
}));

const boardService = require('../../server/services/boardService');
const boardRouter = require('../../server/routes/board');

const invoke = (method, url, extra = {}) => {
  const router = boardRouter();
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      query: extra.query || {},
      headers: {},
      isAuthenticated: () => extra.authenticated === true,
      user: extra.user || { user_id: 4, timezone: 'America/New_York' },
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

describe('board routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reads the global board without a session and keeps friends signed in', async () => {
    boardService.board.mockResolvedValue({ scope: 'global', games: [], standings: [], board: null });
    const global = await invoke('GET', '/', { query: { tz: 'America/Chicago' } });
    expect(global.status).toBe(200);
    expect(boardService.board).toHaveBeenCalledWith(null, { tz: 'America/Chicago' });

    const friends = await invoke('GET', '/', { query: { scope: 'friends' } });
    expect(friends.status).toBe(401);
    expect(boardService.board).toHaveBeenCalledTimes(1);

    await invoke('GET', '/', { authenticated: true, query: { scope: 'friends' } });
    expect(boardService.board).toHaveBeenLastCalledWith(
      { user_id: 4, timezone: 'America/New_York' },
      { scope: 'friends' }
    );
  });
});
