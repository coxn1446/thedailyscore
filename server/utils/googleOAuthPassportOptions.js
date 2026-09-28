/**
 * Options passed to `passport.authenticate('google', opts)` for the authorization redirect.
 *
 * `prompt: 'select_account'` forces Google’s account chooser on every sign-in so the IdP
 * does not silently reuse the last session account (common in in-app browsers).
 */

const GOOGLE_PASSPORT_AUTHENTICATE_DEFAULTS = Object.freeze({
  scope: ['profile', 'email'],
  prompt: 'select_account',
});

function buildGoogleAuthenticateOptions(overrides = {}) {
  return {
    ...GOOGLE_PASSPORT_AUTHENTICATE_DEFAULTS,
    ...overrides,
  };
}

module.exports = {
  GOOGLE_PASSPORT_AUTHENTICATE_DEFAULTS,
  buildGoogleAuthenticateOptions,
};
