jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(() => true),
  query: jest.fn(),
}));

jest.mock('../../server/services/pushService', () => ({
  notifyLike: jest.fn(() => Promise.resolve({ sent: 1 })),
  notifyComment: jest.fn(() => Promise.resolve({ sent: 1 })),
}));

const { isDbHealthy, query } = require('../../server/db');
const feedQueries = require('../../server/queries/feedQueries');
const notificationQueries = require('../../server/queries/notificationQueries');
const scoreQueries = require('../../server/queries/scoreQueries');
const pushService = require('../../server/services/pushService');
const feedService = require('../../server/services/feedService');

const users = {
  4: { user_id: 4, handle: 'ada', display_name: 'Ada', portrait_url: null, suspended: false },
  8: { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null, suspended: false },
};

let scores;
let likes;
let comments;
let nextComment;
let feedScope;

const install = () => {
  query.mockImplementation(async (sql, params) => {
    if (sql === feedQueries.findScope) {
      return { rows: [{ feed_scope: feedScope }] };
    }
    if (sql === feedQueries.findViewerScore) {
      const [userId, scoreId] = params.map(Number);
      const target = scores.find((row) => row.score_id === scoreId);
      const mine = scores.find((row) => (
        row.user_id === userId
        && target
        && row.puzzle_number === target.puzzle_number
        && row.slug === target.slug
        && row.score_id !== scoreId
      ));
      return { rows: mine ? [{ ...mine, game_name: 'Krillion' }] : [] };
    }
    if (sql === feedQueries.dayAverage) {
      const target = scores.find((row) => row.score_id === Number(params[0]));
      const same = scores.filter((row) => (
        target
        && row.puzzle_number === target.puzzle_number
        && row.slug === target.slug
        && !users[row.user_id].suspended
        && row.score != null
      ));
      const average = same.length ? same.reduce((sum, row) => sum + Number(row.score), 0) / same.length : null;
      return { rows: [{ average_score: average, average_guesses: null }] };
    }
    if (sql === notificationQueries.insertNotification) return { rows: [{ notification_id: 1 }] };
    if (sql === feedQueries.listFeed || sql === feedQueries.listFriendsFeed || sql === feedQueries.findPost) {
      const readerId = Number(params[0]);
      const only = sql === feedQueries.findPost ? Number(params[1]) : null;
      const friendsOnly = sql === feedQueries.listFriendsFeed;
      const rows = scores
        .filter((row) => only == null || row.score_id === only)
        .filter((row) => !friendsOnly || row.user_id === readerId)
        .filter((row) => !users[row.user_id].suspended)
        .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)) || b.score_id - a.score_id)
        .map((row) => ({
          ...row,
          ...users[row.user_id],
          game_name: 'Krillion',
          like_count: likes.filter((like) => like.score_id === row.score_id).length,
          liked: likes.some((like) => like.score_id === row.score_id && like.user_id === readerId),
          comment_count: comments.filter((comment) => comment.score_id === row.score_id).length,
        }));
      return { rows };
    }
    if (sql === feedQueries.findScore) {
      const score = scores.find((row) => row.score_id === Number(params[0]));
      if (!score) return { rows: [] };
      return { rows: [{ score_id: score.score_id, user_id: score.user_id, suspended: users[score.user_id].suspended }] };
    }
    if (sql === feedQueries.insertLike) {
      const [scoreId, userId] = params.map(Number);
      if (likes.some((like) => like.score_id === scoreId && like.user_id === userId)) return { rows: [] };
      likes.push({ score_id: scoreId, user_id: userId });
      return { rows: [{ score_id: scoreId }] };
    }
    if (sql === feedQueries.deleteLike) {
      const [scoreId, userId] = params.map(Number);
      likes = likes.filter((like) => !(like.score_id === scoreId && like.user_id === userId));
      return { rows: [] };
    }
    if (sql === feedQueries.countLikes) {
      const [scoreId, userId] = params.map(Number);
      return {
        rows: [{
          like_count: likes.filter((like) => like.score_id === scoreId).length,
          liked: likes.some((like) => like.score_id === scoreId && like.user_id === userId),
        }],
      };
    }
    if (sql === feedQueries.listComments) {
      const scoreId = Number(params[0]);
      return {
        rows: comments
          .filter((comment) => comment.score_id === scoreId && !users[comment.user_id].suspended)
          .map((comment) => ({ ...comment, ...users[comment.user_id] })),
      };
    }
    if (sql === feedQueries.insertComment) {
      const saved = {
        comment_id: nextComment,
        score_id: Number(params[0]),
        user_id: Number(params[1]),
        body: params[2],
        image_url: params[3] || null,
        created_at: '2026-11-18T12:00:00.000Z',
      };
      nextComment += 1;
      comments.push(saved);
      return { rows: [saved] };
    }
    if (sql === feedQueries.findUser) {
      const user = users[Number(params[0])];
      return { rows: user ? [user] : [] };
    }
    if (sql === feedQueries.findComment) {
      const comment = comments.find((row) => row.comment_id === Number(params[0]));
      if (!comment) return { rows: [] };
      return { rows: [{ ...comment, suspended: users[comment.user_id].suspended }] };
    }
    if (sql === feedQueries.deleteComment) {
      const [commentId, userId] = params.map(Number);
      comments = comments.filter((row) => !(row.comment_id === commentId && row.user_id === userId));
      return { rows: [] };
    }
    if (sql === scoreQueries.setScoreImage) {
      const score = scores.find((row) => row.score_id === Number(params[0]) && row.user_id === Number(params[1]));
      if (!score) return { rows: [] };
      score.image_url = params[2];
      return { rows: [{ image_url: params[2] }] };
    }
    throw new Error(`unexpected sql: ${String(sql).slice(0, 40)}`);
  });
};

describe('feed service', () => {
  beforeEach(() => {
    isDbHealthy.mockReturnValue(true);
    scores = [
      {
        score_id: 1,
        user_id: 4,
        puzzle_number: 74,
        snippet: '🐟',
        score: 355,
        guesses: null,
        solved: true,
        played_on: '2026-11-18',
        image_url: null,
        created_at: '2026-11-18T12:00:00.000Z',
        slug: 'krillion',
        rank_basis: 'score',
        guess_cap: null,
      },
      {
        score_id: 2,
        user_id: 8,
        puzzle_number: 74,
        snippet: '',
        score: 200,
        guesses: null,
        solved: true,
        played_on: '2026-11-18',
        image_url: null,
        created_at: '2026-11-18T11:00:00.000Z',
        slug: 'krillion',
        rank_basis: 'score',
        guess_cap: null,
      },
    ];
    likes = [];
    comments = [];
    nextComment = 1;
    feedScope = 'everyone';
    users[4].suspended = false;
    users[8].suspended = false;
    pushService.notifyLike.mockClear();
    pushService.notifyComment.mockClear();
    install();
  });

  test('limits the feed to the reader when friends is saved', async () => {
    feedScope = 'friends';
    const feed = await feedService.list(8);
    expect(feed.scope).toBe('friends');
    expect(feed.posts.map((post) => post.score_id)).toEqual([2]);
  });

  test('returns the viewer score for the same puzzle', async () => {
    const payload = await feedService.get(4, 2);
    expect(payload.viewer_score).toMatchObject({ score_id: 1, score: 355 });
    expect(payload.day_average.score).toBe(277.5);
    const own = await feedService.get(4, 1);
    expect(own.viewer_score).toBeNull();
  });

  test('lists scores for a signed-in reader', async () => {
    const feed = await feedService.list(8);
    expect(feed.posts.map((post) => post.score_id)).toEqual([1, 2]);
    expect(feed.posts[0].user.handle).toBe('ada');
    expect(feed.posts[0].game.name).toBe('Krillion');
    expect(feed.posts[0].liked).toBe(false);
    expect(feed.posts[0].created_at).toBe('2026-11-18T12:00:00.000Z');
  });

  test('likes, repeats, and unlikes a score', async () => {
    const liked = await feedService.setLike(8, 1, true);
    expect(liked).toEqual({ liked: true, like_count: 1 });
    expect(pushService.notifyLike).toHaveBeenCalledWith({
      authorId: 4,
      scoreId: 1,
      actor: users[8],
    });
    const again = await feedService.setLike(8, 1, true);
    expect(again.like_count).toBe(1);
    expect(pushService.notifyLike).toHaveBeenCalledTimes(1);
    const cleared = await feedService.setLike(8, 1, false);
    expect(cleared).toEqual({ liked: false, like_count: 0 });
    expect(pushService.notifyLike).toHaveBeenCalledTimes(1);
  });

  test('does not notify the author of their own like', async () => {
    await feedService.setLike(4, 1, true);
    expect(pushService.notifyLike).not.toHaveBeenCalled();
  });

  test('keeps the like when the push fails', async () => {
    pushService.notifyLike.mockRejectedValueOnce(new Error('offline'));
    const liked = await feedService.setLike(8, 1, true);
    expect(liked).toEqual({ liked: true, like_count: 1 });
  });

  test('hides a missing or suspended score', async () => {
    users[4].suspended = true;
    await expect(feedService.setLike(8, 1, true)).rejects.toMatchObject({ status: 404, message: 'Score not found' });
    await expect(feedService.setLike(8, 99, true)).rejects.toMatchObject({ status: 404 });
    const feed = await feedService.list(8);
    expect(feed.posts.map((post) => post.user_id || post.user.user_id)).toEqual([8]);
  });

  test('adds a comment and lets only the author delete it', async () => {
    await expect(feedService.addComment(8, 1, '   ')).rejects.toMatchObject({ status: 400, message: 'Comment is required' });
    await expect(feedService.addComment(8, 1, 'x'.repeat(501))).rejects.toMatchObject({ status: 400, message: 'Comment is too long' });
    const saved = await feedService.addComment(8, 1, '  sharp  ');
    expect(saved.comment.body).toBe('sharp');
    const pictured = await feedService.addComment(8, 1, '', '/uploads/desk.png');
    expect(pictured.comment.image_url).toBe('/uploads/desk.png');
    expect(pictured.comment.body).toBe('');
    expect(saved.comment.user.handle).toBe('bea');
    expect(pushService.notifyComment).toHaveBeenCalledTimes(2);
    expect(pushService.notifyComment).toHaveBeenCalledWith({
      authorId: 4,
      scoreId: 1,
      actor: users[8],
    });
    const listed = await feedService.comments(1);
    expect(listed.comments).toHaveLength(2);
    await expect(feedService.removeComment(4, saved.comment.comment_id)).rejects.toMatchObject({
      status: 403,
      message: 'Not your comment',
    });
    await expect(feedService.removeComment(8, 99)).rejects.toMatchObject({ status: 404, message: 'Comment not found' });
    await expect(feedService.removeComment(8, saved.comment.comment_id)).resolves.toEqual({ ok: true });
    await expect(feedService.removeComment(8, pictured.comment.comment_id)).resolves.toEqual({ ok: true });
    expect((await feedService.comments(1)).comments).toHaveLength(0);
  });

  test('does not notify the author of their own comment', async () => {
    const own = await feedService.addComment(4, 1, 'mine');
    expect(own.comment.user.handle).toBe('ada');
    expect(pushService.notifyComment).not.toHaveBeenCalled();
  });

  test('keeps the comment when the push fails', async () => {
    pushService.notifyComment.mockRejectedValueOnce(new Error('offline'));
    const saved = await feedService.addComment(8, 1, 'still here');
    expect(saved.comment.body).toBe('still here');
  });

  test('lets the owner attach a picture from an upload', async () => {
    await expect(feedService.setImage(8, 1, '/uploads/bea.png')).rejects.toMatchObject({
      status: 403,
      message: 'Not your score',
    });
    const saved = await feedService.setImage(4, 1, 'https://storage.googleapis.com/thedailyscore-528401-uploads/uploads/desk.png');
    expect(saved.image_url).toContain('/uploads/desk.png');
    const cleared = await feedService.setImage(4, 1, null);
    expect(cleared.image_url).toBeNull();
    await expect(feedService.setImage(4, 1, 'https://evil.example/a.png')).rejects.toMatchObject({
      status: 400,
      message: 'Picture is not valid',
    });
  });

  test('refuses the feed when the database is down', async () => {
    isDbHealthy.mockReturnValue(false);
    await expect(feedService.list(4)).rejects.toMatchObject({ status: 503 });
  });
});
