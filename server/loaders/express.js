const path = require('path');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const pgSession = require('connect-pg-simple')(session);
const { getPool, isDbHealthy } = require('../db');
const { getSessionCookieSameSiteAndSecure } = require('../utils/sessionCookieSettings');

module.exports = async ({ app }) => {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production' || env === 'qa';

  app.set('trust proxy', 1);

  app.use(
    cors({
      origin: process.env.DEFAULT_CLIENT_URL || 'http://localhost:3000',
      credentials: true,
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.set(
    'upload',
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: isProd ? 500 : 5000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );

  const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      ...getSessionCookieSameSiteAndSecure({
        defaultClientUrl: process.env.DEFAULT_CLIENT_URL || 'http://localhost:3000',
      }),
    },
  };

  if (isDbHealthy()) {
    sessionOptions.store = new pgSession({
      pool: getPool(),
      tableName: 'session',
      createTableIfMissing: true,
    });
  } else {
    console.warn('Using in-memory session store (database unavailable).');
  }

  app.use(session(sessionOptions));

  return app;
};
