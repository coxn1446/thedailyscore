jest.mock('../../server/services/feedService', () => ({
  list: jest.fn(),
  get: jest.fn(),
  setLike: jest.fn(),
  comments: jest.fn(),
  addComment: jest.fn(),
  removeComment: jest.fn(),
  setImage: jest.fn(),
}));

const feedService = require('../../server/services/feedService');
const feedRouter = require('../../server/routes/feed');

const invoke = (method, url, extra = {}) => {
  const router = feedRouter();
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

describe('feed routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects a guest', async () => {
    const listed = await invoke('GET', '/');
    const liked = await invoke('POST', '/3/like');
    expect(listed.status).toBe(401);
    expect(liked.status).toBe(401);
    expect(feedService.list).not.toHaveBeenCalled();
    expect(feedService.setLike).not.toHaveBeenCalled();
  });

  test('lists the feed and toggles a like for the caller', async () => {
    feedService.list.mockResolvedValue({ posts: [] });
    feedService.setLike.mockResolvedValue({ liked: true, like_count: 1 });
    const listed = await invoke('GET', '/', { authenticated: true });
    expect(listed.status).toBe(200);
    expect(feedService.list).toHaveBeenCalledWith(4);
    const liked = await invoke('POST', '/3/like', { authenticated: true });
    expect(liked.body.liked).toBe(true);
    expect(feedService.setLike).toHaveBeenCalledWith(4, 3, true);
    await invoke('DELETE', '/3/like', { authenticated: true });
    expect(feedService.setLike).toHaveBeenLastCalledWith(4, 3, false);
  });

  test('rejects an unknown score id before the service', async () => {
    const liked = await invoke('POST', '/0/like', { authenticated: true });
    expect(liked.status).toBe(404);
    expect(feedService.setLike).not.toHaveBeenCalled();
  });

  test('posts a comment and removes the caller’s own', async () => {
    feedService.addComment.mockResolvedValue({ comment: { comment_id: 9, body: 'sharp' } });
    feedService.removeComment.mockResolvedValue({ ok: true });
    const posted = await invoke('POST', '/3/comments', { authenticated: true, body: { body: 'sharp' } });
    expect(posted.status).toBe(201);
    expect(feedService.addComment).toHaveBeenCalledWith(4, 3, 'sharp', undefined);
    const removed = await invoke('DELETE', '/comments/9', { authenticated: true });
    expect(removed.body.ok).toBe(true);
    expect(feedService.removeComment).toHaveBeenCalledWith(4, 9);
  });

  test('returns one score for the post route', async () => {
    feedService.get.mockResolvedValue({ post: { score_id: 3 } });
    const one = await invoke('GET', '/3', { authenticated: true });
    expect(one.status).toBe(200);
    expect(feedService.get).toHaveBeenCalledWith(4, 3);
  });

  test('sets a picture for the caller', async () => {
    feedService.setImage.mockResolvedValue({ image_url: '/uploads/desk.png' });
    const saved = await invoke('PATCH', '/3/image', {
      authenticated: true,
      body: { image_url: '/uploads/desk.png' },
    });
    expect(saved.body.image_url).toBe('/uploads/desk.png');
    expect(feedService.setImage).toHaveBeenCalledWith(4, 3, '/uploads/desk.png');
  });
});
