/**
 * Session cookie SameSite / Secure rules for express-session.
 *
 * Apple Sign In uses form_post to the site origin; browsers treat that as a cross-site POST.
 * SameSite=Lax does not attach the cookie on that navigation.
 * Any HTTPS client origin (QA, prod) uses SameSite=None + Secure so the session persists.
 *
 * Plain HTTP (typical local Vite) uses Lax + non-secure cookies.
 */
function getSessionCookieSameSiteAndSecure(options = {}) {
  const { defaultClientUrl } = options;
  const raw = defaultClientUrl == null ? '' : String(defaultClientUrl).trim();
  if (raw.toLowerCase().startsWith('https://')) {
    return { sameSite: 'none', secure: true };
  }
  return { sameSite: 'lax', secure: false };
}

module.exports = { getSessionCookieSameSiteAndSecure };
