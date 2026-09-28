require('dotenv').config();

const http = require('http');
const express = require('express');
const { initSecrets } = require('./server/config/secrets');
const { initDb, closeDb } = require('./server/db');
const loaders = require('./server/loaders');
const socketIO = require('./server/socket');

const PORT = process.env.PORT || 8080;
const MAX_STARTUP_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

let server;

const startServer = async (attempt = 1) => {
  try {
    await initSecrets();
    await initDb();

    const app = express();
    await loaders({ app });

    server = http.createServer(app);
    socketIO.initialize(server);

    server.listen(PORT, () => {
      console.log(`The Daily Score server listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (err) {
    console.error(`Startup attempt ${attempt} failed:`, err);
    if (attempt < MAX_STARTUP_RETRIES) {
      console.log(`Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      setTimeout(() => startServer(attempt + 1), RETRY_DELAY_MS);
    } else {
      console.error('Max startup retries reached. Exiting.');
      process.exit(1);
    }
  }
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    await closeDb();
    process.exit(0);
  }
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
