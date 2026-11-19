const { getSessionCookieSameSiteAndSecure } = require('./sessionCookieSettings');

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * rolling re-sends the session cookie on every response that already presented one,
 * resetting its expiry so a live sign-in does not age out between visits.
 */
function buildSessionOptions({ secret, defaultClientUrl } = {}) {
  return {
    secret: secret || 'dev-session-secret-change-me',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      maxAge: THIRTY_DAYS_MS,
      ...getSessionCookieSameSiteAndSecure({
        defaultClientUrl: defaultClientUrl || 'http://localhost:3000',
      }),
    },
  };
}

module.exports = { buildSessionOptions, THIRTY_DAYS_MS };
