const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const boardService = require('../services/boardService');

module.exports = () => {
  const router = Router();

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const payload = await boardService.board(req.user, req.query || {});
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
