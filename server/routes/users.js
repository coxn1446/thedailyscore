const { Router } = require('express');
const authService = require('../services/authService');
const requireAuth = require('../middleware/requireAuth');

module.exports = () => {
  const router = Router();

  router.post('/handle', requireAuth, async (req, res, next) => {
    try {
      const user = await authService.claimHandle(req.user.user_id, {
        handle: req.body?.handle,
        timezone: req.body?.timezone,
        displayName: req.body?.displayName,
        acceptedPolicies: req.body?.acceptedPolicies,
      });
      return req.login(user, (err) => {
        if (err) return next(err);
        return res.json({ user });
      });
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
