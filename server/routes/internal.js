const { Router } = require('express');
const pushService = require('../services/pushService');

const cronAuthorized = (req) => {
  const expected = typeof process.env.CRON_SECRET === 'string' ? process.env.CRON_SECRET.trim() : '';
  if (!expected) {
    return process.env.NODE_ENV === 'development';
  }
  const header = req.get?.('x-cron-secret') || req.headers?.['x-cron-secret'] || '';
  const bearer = (req.get?.('authorization') || req.headers?.authorization || '').replace(
    /^Bearer\s+/i,
    ''
  );
  return header === expected || bearer === expected;
};

module.exports = () => {
  const router = Router();

  router.post('/reminders', async (req, res, next) => {
    if (!cronAuthorized(req)) {
      return res.status(401).json({ error: 'Not authorized' });
    }
    try {
      const result = await pushService.sendReminders();
      return res.json(result);
    } catch (err) {
      return next(err);
    }
  });

  return router;
};
