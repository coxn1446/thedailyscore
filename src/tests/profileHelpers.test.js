import { deleteAccount, exportScores, updateProfile, uploadPortrait } from '../helpers/profileHelpers';

describe('profileHelpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    global.URL.createObjectURL = jest.fn(() => 'blob:scores');
    global.URL.revokeObjectURL = jest.fn();
  });

  test('patches the caller profile and uploads a portrait without a json content type', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { user_id: 4, handle: 'william', dispatch_mode: 'auto' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ media: { media_url: '/uploads/portrait.png' } }),
      });

    const saved = await updateProfile({ handle: 'william', dispatch_mode: 'auto' });
    expect(saved.user.handle).toBe('william');
    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/profile',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ handle: 'william', dispatch_mode: 'auto' }),
      })
    );

    const file = new File(['img'], 'portrait.png', { type: 'image/png' });
    await expect(uploadPortrait(file)).resolves.toBe('/uploads/portrait.png');
    const [, options] = global.fetch.mock.calls[1];
    expect(options.method).toBe('POST');
    expect(options.headers).toBeUndefined();
    expect(options.body).toBeInstanceOf(FormData);
  });

  test('downloads the caller csv and deletes the account', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['game\n']),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true }),
      });

    await exportScores();
    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/profile/export', { credentials: 'include' });
    await deleteAccount();
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/profile',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' })
    );
  });
});
