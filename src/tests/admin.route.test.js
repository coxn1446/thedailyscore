jest.mock('../../server/services/adminService', () => ({
  listRequests: jest.fn(),
  unseenCount: jest.fn(),
  markSeen: jest.fn(),
}));

const adminService = require('../../server/services/adminService');
const adminRouter = require('../../server/routes/admin');

const invoke = (method, url, extra = {}) => {
  const router = adminRouter();
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      body: extra.body,
      headers: {},
      isAuthenticated: () => extra.authenticated === true,
      user: extra.user || { user_id: 4, is_admin: false },
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
    });
  });
};

describe('admin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a guest and a reader who is not an admin', async () => {
    const guest = await invoke('GET', '/requests');
    const reader = await invoke('GET', '/requests', { authenticated: true });
    expect(guest.status).toBe(401);
    expect(reader.status).toBe(403);
    expect(reader.body.error).toBe('Not an admin');
    expect(adminService.listRequests).not.toHaveBeenCalled();
  });

  test('lists requests, counts unseen, and marks them seen for an admin', async () => {
    const admin = { authenticated: true, user: { user_id: 1, is_admin: true } };
    adminService.listRequests.mockResolvedValue({ requests: [] });
    adminService.unseenCount.mockResolvedValue({ count: 1 });
    adminService.markSeen.mockResolvedValue({ count: 0 });

    const listed = await invoke('GET', '/requests', admin);
    const unseen = await invoke('GET', '/requests/unseen', admin);
    const seen = await invoke('POST', '/requests/seen', admin);

    expect(listed.body).toEqual({ requests: [] });
    expect(unseen.body).toEqual({ count: 1 });
    expect(seen.body).toEqual({ count: 0 });
    expect(adminService.listRequests).toHaveBeenCalled();
    expect(adminService.unseenCount).toHaveBeenCalled();
    expect(adminService.markSeen).toHaveBeenCalled();
  });
});
