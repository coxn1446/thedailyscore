import {
  deleteComment,
  fetchComments,
  fetchFeed,
  likeScore,
  postComment,
  setScorePicture,
  unlikeScore,
  uploadPicture,
} from '../helpers/feedHelpers';

describe('feedHelpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('loads the feed and toggles a like', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ posts: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ liked: true, like_count: 1 }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ liked: false, like_count: 0 }) });

    await expect(fetchFeed()).resolves.toEqual({ posts: [] });
    await likeScore(3);
    await unlikeScore(3);

    expect(global.fetch).toHaveBeenNthCalledWith(1, '/api/feed', expect.objectContaining({ credentials: 'include' }));
    expect(global.fetch).toHaveBeenNthCalledWith(2, '/api/feed/3/like', expect.objectContaining({ method: 'POST' }));
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/feed/3/like', expect.objectContaining({ method: 'DELETE' }));
  });

  test('posts and deletes a comment', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ comments: [] }) })
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ comment: { comment_id: 9, body: 'sharp' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) });

    await fetchComments(3);
    await postComment(3, 'sharp');
    await deleteComment(9);

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/feed/3/comments',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'sharp' }) })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(3, '/api/feed/comments/9', expect.objectContaining({ method: 'DELETE' }));
  });

  test('uploads a picture and stores it on the score', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({ media: { media_url: '/uploads/desk.png' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ image_url: '/uploads/desk.png' }) });

    const file = new File(['img'], 'desk.png', { type: 'image/png' });
    const steps = [];
    await expect(uploadPicture(file, (value) => steps.push(value))).resolves.toBe('/uploads/desk.png');
    expect(steps).toEqual([50, 100]);
    await setScorePicture(3, '/uploads/desk.png');

    expect(global.fetch.mock.calls[0][0]).toBe('/api/uploads');
    expect(global.fetch.mock.calls[0][1].body).toBeInstanceOf(FormData);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/feed/3/image',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ image_url: '/uploads/desk.png' }) })
    );
  });

  test('reports a failed upload', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, status: 400, json: async () => ({ error: 'File is required' }) });
    await expect(uploadPicture(new File(['x'], 'x.png'))).rejects.toThrow('File is required');
  });
});