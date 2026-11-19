const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const adminService = require('../services/adminService');

const requireAdmin = (req, res, next) => {
  if (req.user?.is_admin !== true) {
    return res.status(403).json({ error: 'Not an admin' });
  }
  return next();
};

module.exports = () => {
  const router = Router();

  router.get('/requests/unseen', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      return res.json(await adminService.unseenCount());
    } catch (err) {
      return next(err);
    }
  });

  router.post('/requests/seen', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      return res.json(await adminService.markSeen());
    } catch (err) {
      return next(err);
    }
  });

  router.get('/requests', requireAuth, requireAdmin, async (req, res, next) => {
    try {
      return res.json(await adminService.listRequests());
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
