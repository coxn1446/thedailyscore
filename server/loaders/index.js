const expressLoader = require('./express');
const passportLoader = require('./passport');
const routes = require('../routes');

module.exports = async ({ app }) => {
  await expressLoader({ app });
  await passportLoader({ app });

  app.use('/api', routes());

  app.use('/api', (err, req, res, next) => {
    if (res.headersSent) return next(err);
    const status = err.status || 500;
    if (status >= 500) console.error('API error:', err);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  const env = process.env.NODE_ENV || 'development';
  if (env === 'production' || env === 'qa') {
    const express = require('express');
    const path = require('path');
    const buildPath = path.join(__dirname, '../../build');
    app.use(express.static(buildPath));
    app.get(/.*/, (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  return app;
};
