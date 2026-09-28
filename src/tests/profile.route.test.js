jest.mock('../../server/services/profileService', () => ({
  read: jest.fn(),
  update: jest.fn(),
  updateAlerts: jest.fn(),
  exportScores: jest.fn(),
  removeAccount: jest.fn(),
}));

const profileService = require('../../server/services/profileService');
const profileRouter = require('../../server/routes/profile');

const invoke = (method, url, extra = {}) => {
  const router = profileRouter();
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      body: extra.body,
      query: extra.query || {},
      headers: {},
      isAuthenticated: () => extra.authenticated === true,
      user: extra.user || { user_id: 4, suspended: false },
      logout(done) {
        done();
      },
      session: {
        destroy(done) {
          done();
        },
      },
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
      },
      clearCookie() {},
      json(payload) {
        resolve({ status: this.statusCode || 200, body: payload, headers: this.headers });
        return this;
      },
      send(payload) {
        resolve({ status: this.statusCode || 200, body: payload, headers: this.headers });
        return this;
      },
    };
    const path = url.split('?')[0];
    if (url.includes('?')) {
      const search = new URLSearchParams(url.slice(url.indexOf('?') + 1));
      req.query = Object.fromEntries(search.entries());
    }
    req.url = path;
    router(req, res, (err) => {
      if (err) resolve({ status: err.status || 500, body: { error: err.message } });
      else resolve({ status: res.statusCode || 200, body: res.body, headers: res.headers });
    });
  });
};

describe('profile routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a guest', async () => {
    const read = await invoke('GET', '/');
    const patched = await invoke('PATCH', '/', { body: { handle: 'will' } });
    expect(read.status).toBe(401);
    expect(patched.status).toBe(401);
    expect(profileService.read).not.toHaveBeenCalled();
    expect(profileService.update).not.toHaveBeenCalled();
  });

  test('reads and patches only the signed-in reader', async () => {
    profileService.read.mockResolvedValue({ user: { user_id: 4 }, stats: [] });
    profileService.update.mockResolvedValue({ user_id: 4, handle: 'william', dispatch_mode: 'auto' });
    const read = await invoke('GET', '/', { authenticated: true });
    expect(read.status).toBe(200);
    expect(profileService.read).toHaveBeenCalledWith(4, undefined, 'all');

    const patched = await invoke('PATCH', '/', {
      authenticated: true,
      body: { handle: 'william', dispatch_mode: 'auto' },
    });
    expect(patched.status).toBe(200);
    expect(profileService.update).toHaveBeenCalledWith(4, { handle: 'william', dispatch_mode: 'auto' });
  });

  test('another user cannot read or patch this profile', async () => {
    const err = new Error('Not your profile');
    err.status = 403;
    profileService.read.mockRejectedValue(err);
    profileService.update.mockRejectedValue(err);

    const read = await invoke('GET', '/?user_id=8', { authenticated: true });
    const patched = await invoke('PATCH', '/', {
      authenticated: true,
      body: { user_id: 8, handle: 'stolen' },
    });
    expect(read.status).toBe(403);
    expect(patched.status).toBe(403);
    expect(profileService.read).toHaveBeenCalledWith(4, '8', 'all');
    expect(profileService.update).toHaveBeenCalledWith(4, { user_id: 8, handle: 'stolen' });
  });

  test('exports the caller’s csv and deletes the account', async () => {
    profileService.exportScores.mockResolvedValue('game,puzzle_number,score,guesses,solved,logged_at\n');
    profileService.removeAccount.mockResolvedValue({ ok: true });

    const csv = await invoke('GET', '/export', { authenticated: true });
    expect(csv.status).toBe(200);
    expect(csv.headers['Content-Type']).toMatch(/text\/csv/);
    expect(profileService.exportScores).toHaveBeenCalledWith(4, undefined);

    const removed = await invoke('DELETE', '/', { authenticated: true });
    expect(removed.status).toBe(200);
    expect(profileService.removeAccount).toHaveBeenCalledWith(4, undefined);
  });
});
