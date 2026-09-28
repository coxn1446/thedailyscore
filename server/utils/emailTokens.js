const crypto = require('crypto');

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

const createToken = () => crypto.randomBytes(32).toString('hex');

const hashToken = (token) => {
  if (typeof token !== 'string' || !token.trim()) return null;
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

const expiresAt = (ttlMs) => new Date(Date.now() + ttlMs);

const clientOrigin = () => {
  const raw = process.env.DEFAULT_CLIENT_URL || 'http://localhost:3000';
  return String(raw).replace(/\/$/, '');
};

module.exports = {
  VERIFY_TTL_MS,
  RESET_TTL_MS,
  createToken,
  hashToken,
  expiresAt,
  clientOrigin,
};
