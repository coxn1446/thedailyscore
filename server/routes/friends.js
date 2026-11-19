const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const friendService = require('../services/friendService');

module.exports = () => {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await friendService.list(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/search', requireAuth, async (req, res, next) => {
    try {
      const payload = await friendService.search(req.user.user_id, req.query.q);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await friendService.request(req.user.user_id, req.body?.handle);
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:friendshipId/accept', requireAuth, async (req, res, next) => {
    try {
      const friendshipId = Number.parseInt(req.params.friendshipId, 10);
      const payload = await friendService.respond(req.user.user_id, friendshipId, 'accepted');
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/:friendshipId/decline', requireAuth, async (req, res, next) => {
    try {
      const friendshipId = Number.parseInt(req.params.friendshipId, 10);
      const payload = await friendService.respond(req.user.user_id, friendshipId, 'declined');
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:friendshipId', requireAuth, async (req, res, next) => {
    try {
      const friendshipId = Number.parseInt(req.params.friendshipId, 10);
      const payload = await friendService.remove(req.user.user_id, friendshipId);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
