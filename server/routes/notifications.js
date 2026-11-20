const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const notificationService = require('../services/notificationService');

module.exports = () => {
  const router = Router();

  router.get('/unseen', requireAuth, async (req, res, next) => {
    try {
      return res.json(await notificationService.unreadCount(req.user.user_id));
    } catch (err) {
      return next(err);
    }
  });

  router.post('/seen', requireAuth, async (req, res, next) => {
    try {
      return res.json(await notificationService.markRead(req.user.user_id));
    } catch (err) {
      return next(err);
    }
  });

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      return res.json(await notificationService.list(req.user.user_id));
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
