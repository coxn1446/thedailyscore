/**
 * Absolute Apple callback URL for Passport.
 *
 * Apple matches `redirect_uri` exactly against Return URLs on the Services ID.
 * A relative callback is resolved from the incoming Host, which on Cloud Run can
 * be the `*.run.app` hostname instead of qa.harborhands.co / harborhands.co.
 */

const APPLE_CALLBACK_PATH = '/api/auth/apple/callback';

function getAppleCallbackURL(options = {}) {
  const raw = options.defaultClientUrl == null ? process.env.DEFAULT_CLIENT_URL : options.defaultClientUrl;
  const base = String(raw == null ? 'http://localhost:3000' : raw)
    .trim()
    .replace(/\/$/, '');
  return `${base || 'http://localhost:3000'}${APPLE_CALLBACK_PATH}`;
}

module.exports = {
  APPLE_CALLBACK_PATH,
  getAppleCallbackURL,
};
