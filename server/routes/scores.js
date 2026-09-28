const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const scoreService = require('../services/scoreService');

module.exports = () => {
  const router = Router();

  router.get('/bests', requireAuth, async (req, res, next) => {
    try {
      const payload = await scoreService.personalBests(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/logged-today', requireAuth, async (req, res, next) => {
    try {
      const payload = await scoreService.loggedToday(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/gazette', requireAuth, async (req, res, next) => {
    try {
      const payload = await scoreService.gazette(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/preview', requireAuth, async (req, res, next) => {
    try {
      const payload = await scoreService.preview(
        req.user.user_id,
        req.body?.paste,
        new Date(),
        req.user.timezone || 'UTC'
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/archive', requireAuth, async (req, res, next) => {
    try {
      const payload = await scoreService.archive(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:scoreId', requireAuth, async (req, res, next) => {
    try {
      const scoreId = Number.parseInt(req.params.scoreId, 10);
      if (!Number.isInteger(scoreId) || scoreId <= 0) {
        const err = new Error('Score not found');
        err.status = 404;
        throw err;
      }
      const payload = await scoreService.removeScore(req.user.user_id, scoreId);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:scoreId/groups', requireAuth, async (req, res, next) => {
    try {
      const scoreId = Number.parseInt(req.params.scoreId, 10);
      if (!Number.isInteger(scoreId) || scoreId <= 0) {
        const err = new Error('Score not found');
        err.status = 404;
        throw err;
      }
      const groups = Array.isArray(req.body?.groups) ? req.body.groups : [];
      const payload = await scoreService.updateShares(req.user.user_id, scoreId, groups);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const groups = Array.isArray(req.body?.groups) ? req.body.groups : undefined;
      const payload = await scoreService.confirm(
        req.user.user_id,
        req.body?.paste,
        new Date(),
        groups,
        req.user.timezone || 'UTC'
      );
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
