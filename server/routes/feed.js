const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const feedService = require('../services/feedService');

const scoreIdOf = (value) => {
  const scoreId = Number.parseInt(value, 10);
  if (!Number.isInteger(scoreId) || scoreId <= 0) {
    const err = new Error('Score not found');
    err.status = 404;
    throw err;
  }
  return scoreId;
};

module.exports = () => {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const viewerId = req.isAuthenticated?.() && req.user ? req.user.user_id : null;
      const payload = await feedService.list(viewerId);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:scoreId/like', requireAuth, async (req, res, next) => {
    try {
      const payload = await feedService.setLike(req.user.user_id, scoreIdOf(req.params.scoreId), true);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:scoreId/like', requireAuth, async (req, res, next) => {
    try {
      const payload = await feedService.setLike(req.user.user_id, scoreIdOf(req.params.scoreId), false);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:scoreId', async (req, res, next) => {
    try {
      const viewerId = req.isAuthenticated?.() && req.user ? req.user.user_id : null;
      const payload = await feedService.get(viewerId, scoreIdOf(req.params.scoreId));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:scoreId/comments', async (req, res, next) => {
    try {
      const payload = await feedService.comments(scoreIdOf(req.params.scoreId));
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:scoreId/comments', requireAuth, async (req, res, next) => {
    try {
      const payload = await feedService.addComment(
        req.user.user_id,
        scoreIdOf(req.params.scoreId),
        req.body?.body,
        req.body?.image_url
      );
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/comments/:commentId', requireAuth, async (req, res, next) => {
    try {
      const commentId = Number.parseInt(req.params.commentId, 10);
      if (!Number.isInteger(commentId) || commentId <= 0) {
        const err = new Error('Comment not found');
        err.status = 404;
        throw err;
      }
      const payload = await feedService.removeComment(req.user.user_id, commentId);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:scoreId/image', requireAuth, async (req, res, next) => {
    try {
      const payload = await feedService.setImage(req.user.user_id, scoreIdOf(req.params.scoreId), req.body?.image_url);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
