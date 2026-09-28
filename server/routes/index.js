const { Router } = require('express');
const authRoutes = require('./auth');
const usersRoutes = require('./users');
const uploadsRoutes = require('./uploads');
const groupsRoutes = require('./groups');
const scoresRoutes = require('./scores');
const profileRoutes = require('./profile');
const gameRequestRoutes = require('./gameRequests');
const deviceRoutes = require('./devices');
const internalRoutes = require('./internal');
const { isDbHealthy } = require('../db');

module.exports = () => {
  const router = Router();

  router.get('/health', (req, res) => {
    const payload = {
      status: 'ok',
      database: isDbHealthy() ? 'connected' : 'unavailable',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      secrets: {
        SESSION_SECRET: Boolean(process.env.SESSION_SECRET),
        DB_USER: Boolean(process.env.DB_USER),
        DB_PASSWORD: Boolean(process.env.DB_PASSWORD),
        DB_DATABASE: Boolean(process.env.DB_DATABASE),
        GOOGLE_CLIENT_ID: Boolean(process.env.GOOGLE_CLIENT_ID),
        APPLE_CLIENT_ID: Boolean(process.env.APPLE_CLIENT_ID),
        STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
        EMAIL_ADDRESS: Boolean(process.env.EMAIL_ADDRESS),
      },
    };
    if (process.env.DB_SCHEMA && String(process.env.DB_SCHEMA).trim()) {
      payload.db_schema = process.env.DB_SCHEMA.trim();
    }
    res.json(payload);
  });

  router.use('/auth', authRoutes());
  router.use('/users', usersRoutes());
  router.use('/uploads', uploadsRoutes());
  router.use('/groups', groupsRoutes());
  router.use('/scores', scoresRoutes());
  router.use('/profile', profileRoutes());
  router.use('/game-requests', gameRequestRoutes());
  router.use('/devices', deviceRoutes());
  router.use('/internal', internalRoutes());

  return router;
};
