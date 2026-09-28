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
      const alertsOnly = body.display_name == null
        && body.handle == null
        && body.email == null
        && (body.remind_daily != null || body.alert_crown != null || body.alert_new_member != null);
      const user = alertsOnly
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
