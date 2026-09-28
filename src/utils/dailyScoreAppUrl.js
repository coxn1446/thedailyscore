/** Matches server deep links in server/services/authService.js and capacitor.config.js. */
export const DAILY_SCORE_NATIVE_URL_HOST = 'thedailyscore.com';
export const DAILY_SCORE_NATIVE_URL_SCHEME = 'Thedailyscore';

export function pathFromDailyScoreAppUrl(url) {
  if (url == null || typeof url !== 'string' || !url.trim()) return null;
  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  const scheme = parsed.protocol.replace(/:$/, '').toLowerCase();
  if (scheme !== 'thedailyscore') return null;
  if (parsed.hostname.toLowerCase() !== DAILY_SCORE_NATIVE_URL_HOST) return null;
  const pathPart = parsed.pathname === '' ? '/' : parsed.pathname;
  return `${pathPart}${parsed.search || ''}`;
}

export function pathFromIncomingAppUrl(url) {
  return pathFromDailyScoreAppUrl(url);
}

export function stripOAuthHandoffFromInternalPath(path) {
  if (path == null || typeof path !== 'string') return '/';
  const q = path.indexOf('?');
  if (q === -1) return path || '/';
  const pathname = path.slice(0, q) || '/';
  const sp = new URLSearchParams(path.slice(q + 1));
  sp.delete('oauth_handoff');
  const rest = sp.toString();
  if (!rest) return pathname;
  return `${pathname}?${rest}`;
}
