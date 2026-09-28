import { addGroupMember, charterGroup, fetchArchivedGroups, fetchGroup, fetchGroupDay, fetchGroups, inviteUrl, joinGroup, renameGroup, unarchiveGroup, updateGroupGames } from '../helpers/groupHelpers';

describe('groupHelpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('loads and charters groups', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ groups: [], games: [] }),
    });

    await fetchGroups();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups',
      expect.objectContaining({ credentials: 'include' })
    );

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ group: { group_id: 10 } }),
    });
    await charterGroup({ name: 'Sunday desk', games: ['wordle'] });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Sunday desk', games: ['wordle'] }),
      })
    );
  });

  test('updates games, adds a handle, and joins by token', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });
    await fetchGroup(10);
    await fetchGroup(10, 'krillion');
    await fetchGroupDay(10, 'krillion', 1);
    await updateGroupGames(10, [{ slug: 'krillion', enabled: false }]);
    await renameGroup(10, 'Monday desk');
    await fetchArchivedGroups();
    await unarchiveGroup(10);
    await addGroupMember(10, 'alan');
    await joinGroup('invite token');

    expect(global.fetch).toHaveBeenCalledWith('/api/groups/10', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10?game=krillion',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10/days?game=krillion&offset=1',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Monday desk' }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/archived',
      expect.objectContaining({ credentials: 'include' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10/unarchive',
      expect.objectContaining({ method: 'POST' })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10/games',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ games: [{ slug: 'krillion', enabled: false }] }),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/10/members',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ handle: 'alan' }) })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/groups/join/invite%20token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('surfaces the server error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Unknown handle' }),
    });
    await expect(addGroupMember(10, 'missing')).rejects.toThrow('Unknown handle');
  });

  test('builds an invite link', () => {
    expect(inviteUrl('abc')).toBe(`${window.location.origin}/join/abc`);
  });
});
