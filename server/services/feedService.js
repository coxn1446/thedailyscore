const { isDbHealthy, query } = require('../db');
const feedQueries = require('../queries/feedQueries');
const scoreQueries = require('../queries/scoreQueries');
const pushService = require('./pushService');
const { normalizeImageUrl } = require('../utils/imageUrl');

const DB_REQUIRED = 'Database is unavailable. Start Postgres and apply server/db/schema.sql.';
const COMMENT_LIMIT = 500;

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  throw err;
};

const requireDb = () => {
  if (!isDbHealthy()) httpError(503, DB_REQUIRED);
};

const one = async (text, params) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

const flagged = (value) => value === true || value === 't';

const loggedAt = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const presentUser = (row) => ({
  user_id: Number(row.user_id),
  handle: row.handle || null,
  display_name: row.display_name || null,
  portrait_url: row.portrait_url || null,
});

const presentPost = (row) => ({
  score_id: Number(row.score_id),
  puzzle_number: Number(row.puzzle_number),
  snippet: row.snippet || '',
  score: row.score == null ? null : Number(row.score),
  guesses: row.guesses == null ? null : Number(row.guesses),
  solved: row.solved !== false && row.solved !== 'f',
  played_on: row.played_on,
  image_url: row.image_url || null,
  created_at: loggedAt(row.created_at),
  like_count: Number(row.like_count) || 0,
  liked: flagged(row.liked),
  comment_count: Number(row.comment_count) || 0,
  user: presentUser(row),
  game: {
    slug: row.slug,
    name: row.game_name,
    rank_basis: row.rank_basis,
    guess_cap: row.guess_cap == null ? null : Number(row.guess_cap),
  },
});

const presentComment = (row) => ({
  comment_id: Number(row.comment_id),
  body: row.body,
  image_url: row.image_url || null,
  created_at: row.created_at,
  user: presentUser(row),
});

const requireScore = async (scoreId) => {
  const score = await one(feedQueries.findScore, [scoreId]);
  if (!score || flagged(score.suspended)) httpError(404, 'Score not found');
  return score;
};

const list = async (userId) => {
  requireDb();
  const listed = await query(feedQueries.listFeed, [userId]);
  return { posts: listed.rows.map(presentPost) };
};

const get = async (userId, scoreId) => {
  requireDb();
  const row = await one(feedQueries.findPost, [userId, scoreId]);
  if (!row) httpError(404, 'Score not found');
  return { post: presentPost(row) };
};

const notifyAuthor = async (kind, score, userId) => {
  if (Number(score.user_id) === Number(userId)) return;
  try {
    const actor = await one(feedQueries.findUser, [userId]);
    const payload = { authorId: score.user_id, scoreId: score.score_id, actor };
    if (kind === 'like') await pushService.notifyLike(payload);
    else await pushService.notifyComment(payload);
  } catch (err) {
    console.error(kind === 'like' ? 'Like push failed:' : 'Comment push failed:', err.message);
  }
};

const setLike = async (userId, scoreId, liked) => {
  requireDb();
  const score = await requireScore(scoreId);
  let inserted = false;
  if (liked) {
    const saved = await query(feedQueries.insertLike, [scoreId, userId]);
    inserted = Boolean(saved.rows[0]);
  } else {
    await query(feedQueries.deleteLike, [scoreId, userId]);
  }
  if (inserted) await notifyAuthor('like', score, userId);
  const counts = await one(feedQueries.countLikes, [scoreId, userId]);
  return {
    liked: flagged(counts?.liked),
    like_count: Number(counts?.like_count) || 0,
  };
};

const comments = async (scoreId) => {
  requireDb();
  await requireScore(scoreId);
  const listed = await query(feedQueries.listComments, [scoreId]);
  return { comments: listed.rows.map(presentComment) };
};

const addComment = async (userId, scoreId, text, imageUrl) => {
  requireDb();
  const score = await requireScore(scoreId);
  const picture = normalizeImageUrl(imageUrl);
  const body = typeof text === 'string' ? text.trim() : '';
  if (!body && !picture) httpError(400, 'Comment is required');
  if (body.length > COMMENT_LIMIT) httpError(400, 'Comment is too long');
  const saved = await one(feedQueries.insertComment, [scoreId, userId, body, picture]);
  const author = await one(feedQueries.findUser, [userId]);
  await notifyAuthor('comment', score, userId);
  return {
    comment: presentComment({
      ...saved,
      handle: author?.handle,
      display_name: author?.display_name,
      portrait_url: author?.portrait_url,
    }),
  };
};

const removeComment = async (userId, commentId) => {
  requireDb();
  const row = await one(feedQueries.findComment, [commentId]);
  if (!row || flagged(row.suspended)) httpError(404, 'Comment not found');
  if (Number(row.user_id) !== Number(userId)) httpError(403, 'Not your comment');
  await query(feedQueries.deleteComment, [commentId, userId]);
  return { ok: true };
};

const setImage = async (userId, scoreId, imageUrl) => {
  requireDb();
  const score = await requireScore(scoreId);
  if (Number(score.user_id) !== Number(userId)) httpError(403, 'Not your score');
  const picture = normalizeImageUrl(imageUrl);
  const saved = await one(scoreQueries.setScoreImage, [scoreId, userId, picture]);
  if (!saved) httpError(404, 'Score not found');
  return { image_url: saved.image_url || null };
};

module.exports = {
  list,
  get,
  setLike,
  comments,
  addComment,
  removeComment,
  setImage,
};
