import { waitFor } from '@testing-library/react';
import { fetchCurrentUser } from '../helpers/authHelpers';
import {
  apiFetch,
  apiUpload,
  onSessionLost,
  resetSessionClientForTests,
  sessionDocument,
} from '../helpers/sessionClient';
import { AUTH_USER_KEY, cacheGet, cacheSet } from '../utils/sessionCache';

describe('session client', () => {
  beforeEach(() => {
    resetSessionClientForTests();
    sessionStorage.clear();
    global.fetch = jest.fn();
    jest.spyOn(sessionDocument, 'reload').mockImplementation(() => {});
  });

  afterEach(() => {
    sessionDocument.reload.mockRestore();
  });

  test('reads the session even when a reader is saved', async () => {
    cacheSet(AUTH_USER_KEY, { user_id: 1, handle: 'old' });
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { user_id: 1, handle: 'ada' } }),
    });

    await expect(fetchCurrentUser()).resolves.toEqual({ user_id: 1, handle: 'ada' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    );
    expect(cacheGet(AUTH_USER_KEY)).toEqual({ user_id: 1, handle: 'ada' });
  });

  test('retries a score call after the session answers', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { user_id: 4, handle: 'ada' } }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ puzzle_number: 74 }) });

    const res = await apiFetch('/api/scores/preview', { method: 'POST', body: '{}' });
    expect(res.ok).toBe(true);
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/auth/me', expect.objectContaining({ cache: 'no-store' }));
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/scores/preview',
      expect.objectContaining({ method: 'POST', credentials: 'include', cache: 'no-store' })
    );
    expect(sessionDocument.reload).not.toHaveBeenCalled();
  });

  test('reports upload progress and retries after the session answers', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ user: { user_id: 4, handle: 'ada' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ media: { media_url: '/uploads/desk.png' } }),
      });

    const steps = [];
    const result = await apiUpload('/api/uploads', new FormData(), (value) => steps.push(value));
    expect(result.ok).toBe(true);
    expect(result.data.media.media_url).toBe('/uploads/desk.png');
    expect(steps).toEqual([50, 100, 50, 100]);
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/auth/me', expect.objectContaining({ cache: 'no-store' }));
    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      '/api/uploads',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
  });

  test('reloads once when a saved reader’s cookie is missing', async () => {
    cacheSet(AUTH_USER_KEY, { user_id: 4, handle: 'ada' });
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Not authenticated' }),
    });

    const pending = apiFetch('/api/scores', { method: 'POST' });
    await waitFor(() => expect(sessionDocument.reload).toHaveBeenCalledTimes(1));
    expect(cacheGet(AUTH_USER_KEY)).toEqual({ user_id: 4, handle: 'ada' });
    expect(sessionStorage.getItem('ds:session-retry')).toBe('1');
    void pending;
  });

  test('clears a saved reader when the reload still has no session', async () => {
    cacheSet(AUTH_USER_KEY, { user_id: 4, handle: 'ada' });
    sessionStorage.setItem('ds:session-retry', '1');
    const lost = jest.fn();
    onSessionLost(lost);
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Not authenticated' }),
    });

    const pending = apiFetch('/api/scores', { method: 'POST' });
    await waitFor(() => expect(lost).toHaveBeenCalled());
    expect(sessionDocument.reload).not.toHaveBeenCalled();
    expect(cacheGet(AUTH_USER_KEY)).toBeUndefined();
    expect(sessionStorage.getItem('ds:session-retry')).toBeNull();
    void pending;
  });
});
