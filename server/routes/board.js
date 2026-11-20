const { Router } = require('express');
const boardService = require('../services/boardService');

module.exports = () => {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const viewer = req.isAuthenticated?.() && req.user ? req.user : null;
      if (req.query?.scope === 'friends' && !viewer) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      const payload = await boardService.board(viewer, req.query || {});
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
