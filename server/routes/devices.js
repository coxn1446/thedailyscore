const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const deviceService = require('../services/deviceService');

module.exports = () => {
  const router = Router();

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await deviceService.register(req.user.user_id, req.body || {});
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await deviceService.remove(req.user.user_id, req.body || {});
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
