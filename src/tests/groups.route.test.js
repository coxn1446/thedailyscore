jest.mock('../../server/services/groupService', () => ({
  listMine: jest.fn(),
  getGroup: jest.fn(),
  getDay: jest.fn(),
  charter: jest.fn(),
  updateGames: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  rename: jest.fn(),
  listArchived: jest.fn(),
  leave: jest.fn(),
  addMember: jest.fn(),
  joinByToken: jest.fn(),
}));

const groupService = require('../../server/services/groupService');
const groupsRouter = require('../../server/routes/groups');

const invoke = (method, url, extra = {}) => {
  const router = groupsRouter();
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = {
      method,
      url,
      query: Object.fromEntries(parsed.searchParams.entries()),
      body: extra.body,
      params: {},
      headers: {},
      isAuthenticated: () => extra.authenticated === true,
      user: extra.user || { user_id: 4, timezone: 'America/New_York', suspended: false },
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

describe('group routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects guests', async () => {
    const listed = await invoke('GET', '/');
    const created = await invoke('POST', '/', { body: { name: 'Sunday desk' } });
    const joined = await invoke('POST', '/join/invite-token');
    const read = await invoke('GET', '/10');
    const parlor = await invoke('GET', '/10/parlor/messages');
    const posted = await invoke('POST', '/10/parlor/messages', { body: { body: 'hello' } });
    expect(listed.status).toBe(401);
    expect(created.status).toBe(401);
    expect(joined.status).toBe(401);
    expect(read.status).toBe(401);
    expect(parlor.status).toBe(401);
    expect(posted.status).toBe(401);
    expect(groupService.listMine).not.toHaveBeenCalled();
    expect(groupService.charter).not.toHaveBeenCalled();
    expect(groupService.joinByToken).not.toHaveBeenCalled();
    expect(groupService.getGroup).not.toHaveBeenCalled();
  });

  test('charters, reads, and joins for a signed-in reader', async () => {
    groupService.charter.mockResolvedValue({ group: { group_id: 10 } });
    groupService.getGroup.mockResolvedValue({ group: { group_id: 10 } });
    groupService.joinByToken.mockResolvedValue({ group: { group_id: 10, role: 'fellow' } });
    groupService.updateGames.mockResolvedValue({ group: { group_id: 10 } });
    groupService.archive.mockResolvedValue({ group: { group_id: 10, archived: true } });

    const created = await invoke('POST', '/', {
      authenticated: true,
      body: { name: 'Sunday desk', games: ['wordle', 'krillion'] },
    });
    expect(created.status).toBe(201);
    expect(groupService.charter).toHaveBeenCalledWith(
      { user_id: 4, timezone: 'America/New_York', suspended: false },
      { name: 'Sunday desk', games: ['wordle', 'krillion'] }
    );

    const read = await invoke('GET', '/10', { authenticated: true });
    expect(read.status).toBe(200);
    expect(groupService.getGroup).toHaveBeenCalledWith(4, 10, undefined, null);

    groupService.getDay.mockResolvedValue({ entries: [], enabled: true });
    const day = await invoke('GET', '/10/days?game=krillion&offset=1', { authenticated: true });
    expect(day.status).toBe(200);
    expect(groupService.getDay).toHaveBeenCalledWith(4, 10, 'krillion', 1);

    const badDay = await invoke('GET', '/10/days?game=krillion&offset=nope', { authenticated: true });
    expect(badDay.status).toBe(400);
    expect(groupService.getDay).toHaveBeenCalledTimes(1);

    const joined = await invoke('POST', '/join/invite-token', { authenticated: true });
    expect(joined.status).toBe(200);
    expect(groupService.joinByToken).toHaveBeenCalledWith(
      { user_id: 4, timezone: 'America/New_York', suspended: false },
      'invite-token'
    );

    const patched = await invoke('PATCH', '/10/games', {
      authenticated: true,
      body: { games: [{ slug: 'krillion', enabled: false }] },
    });
    expect(patched.status).toBe(200);
    expect(groupService.updateGames).toHaveBeenCalled();

    const archived = await invoke('POST', '/10/archive', { authenticated: true });
    expect(archived.status).toBe(200);
    expect(groupService.archive).toHaveBeenCalled();

    groupService.rename.mockResolvedValue({ group: { group_id: 10, name: 'Monday desk' } });
    const renamed = await invoke('PATCH', '/10', {
      authenticated: true,
      body: { name: 'Monday desk' },
    });
    expect(renamed.status).toBe(200);
    expect(groupService.rename).toHaveBeenCalledWith(
      { user_id: 4, timezone: 'America/New_York', suspended: false },
      10,
      'Monday desk'
    );

    groupService.listArchived.mockResolvedValue({ groups: [] });
    const archivedList = await invoke('GET', '/archived', { authenticated: true });
    expect(archivedList.status).toBe(200);
    expect(groupService.listArchived).toHaveBeenCalledWith(4);

    groupService.unarchive.mockResolvedValue({ group: { group_id: 10, archived: false } });
    const restored = await invoke('POST', '/10/unarchive', { authenticated: true });
    expect(restored.status).toBe(200);
    expect(groupService.unarchive).toHaveBeenCalled();
  });

  test('rejects an invalid group id before the service', async () => {
    const read = await invoke('GET', '/nope', { authenticated: true });
    expect(read.status).toBe(400);
    expect(groupService.getGroup).not.toHaveBeenCalled();
  });
});
