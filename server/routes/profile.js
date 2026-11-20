const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const profileService = require('../services/profileService');

const endSession = (req, res, next, done) => {
  const finish = () => {
    res.clearCookie?.('connect.sid');
    done();
  };
  if (typeof req.logout !== 'function') return finish();
  return req.logout((err) => {
    if (err) return next(err);
    if (req.session?.destroy) return req.session.destroy(() => finish());
    return finish();
  });
};

module.exports = () => {
  const router = Router();

  router.get('/export', requireAuth, async (req, res, next) => {
    try {
      const csv = await profileService.exportScores(req.user.user_id, req.query.user_id);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="scores.csv"');
      res.setHeader('Cache-Control', 'no-store');
      return res.send(csv);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/games', requireAuth, async (req, res, next) => {
    try {
      const payload = await profileService.readGames(req.user.user_id);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.put('/games', requireAuth, async (req, res, next) => {
    try {
      const payload = await profileService.saveGames(req.user.user_id, req.body?.games);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/player/:handle', async (req, res, next) => {
    try {
      const viewerId = req.isAuthenticated?.() && req.user ? req.user.user_id : null;
      const payload = await profileService.readPlayer(viewerId, req.params.handle);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.get('/', requireAuth, async (req, res, next) => {
    try {
      const period = req.query.period === 'week' || req.query.period === 'month' ? req.query.period : 'all';
      const payload = await profileService.read(req.user.user_id, req.query.user_id, period);
      return res.json(payload);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/', requireAuth, async (req, res, next) => {
    try {
      const body = req.body || {};
      const identity = body.display_name != null || body.handle != null || body.email != null;
      const user = !identity && body.feed_scope != null
        ? await profileService.updateFeedScope(req.user.user_id, body)
        : !identity && body.notifications != null
        ? await profileService.updateNotifications(req.user.user_id, body)
        : !identity && body.night_mode != null
          ? await profileService.updateNightMode(req.user.user_id, body)
          : !identity && (body.remind_daily != null || body.alert_crown != null || body.alert_new_member != null)
            ? await profileService.updateAlerts(req.user.user_id, body)
            : await profileService.update(req.user.user_id, body);
      return res.json({ user });
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/', requireAuth, async (req, res, next) => {
    try {
      await profileService.removeAccount(req.user.user_id, req.body?.user_id ?? req.query.user_id);
      return endSession(req, res, next, () => res.json({ ok: true }));
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
