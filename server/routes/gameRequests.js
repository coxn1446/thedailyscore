const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const gameRequestService = require('../services/gameRequestService');

module.exports = () => {
  const router = Router();

  router.post('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await gameRequestService.file(req.user.user_id, req.body || {});
      return res.status(201).json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
