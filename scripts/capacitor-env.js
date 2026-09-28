/**
 * Capacitor iOS flavor resolution for capacitor.config.js.
 * Uses CAP_APP_ENV (not NODE_ENV).
 */

require('dotenv').config({ quiet: true });
const os = require('os');

const DEFAULT_PROD_URL = 'https://thedailyscore.com';
const DEFAULT_QA_URL = 'https://qa.thedailyscore.com';
const LOCALHOST_DEV_URL = 'http://localhost:3000';
const DEV_CLIENT_PORT = 3000;

const SKIP_IFACE = /^(lo|utun|awdl|llw|bridge|vnic|ap|p2p|anpi|dummy|docker|veth|br-)/i;

function isUsableIPv4(addr) {
  const family = addr.family === 'IPv4' || addr.family === 4;
  if (!family || addr.internal) return false;
  const ip = String(addr.address || '');
  if (ip.startsWith('169.254.')) return false;
  return Boolean(ip);
}

function ifaceRank(name) {
  if (name === 'en0') return 0;
  if (name === 'en1') return 1;
  if (/^(en|eth)/i.test(name)) return 2;
  if (/^(wlan|wl)/i.test(name)) return 3;
  return 4;
}

/** First non-internal IPv4 on a real LAN interface (prefers en0). */
function getLanIPv4(ifaces = os.networkInterfaces()) {
  const ranked = Object.entries(ifaces || {}).sort(([a], [b]) => ifaceRank(a) - ifaceRank(b));
  for (const [name, addrs] of ranked) {
    if (SKIP_IFACE.test(name)) continue;
    for (const addr of addrs || []) {
      if (isUsableIPv4(addr)) return addr.address;
    }
  }
  return null;
}

function getDefaultDevServerUrl(ifaces = os.networkInterfaces()) {
  const ip = getLanIPv4(ifaces);
  return ip ? `http://${ip}:${DEV_CLIENT_PORT}` : LOCALHOST_DEV_URL;
}

/** Virtual host for Capacitor `server.hostname` and native OAuth deep links. */
const NATIVE_OAUTH_APP_HOST = 'thedailyscore.com';

const DEFAULT_ALLOW_NAVIGATION_HOSTS = [
  NATIVE_OAUTH_APP_HOST,
  'qa.thedailyscore.com',
  'accounts.google.com',
  'appleid.apple.com',
];

function normalizeCapAppEnv(raw) {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'prod' || v === 'production') return 'prod';
  if (v === 'qa') return 'qa';
  return 'dev';
}

function hostnameFromUrl(raw) {
  try {
    const host = new URL(String(raw || '').trim()).hostname;
    return host || null;
  } catch {
    return null;
  }
}

function getCapacitorAllowNavigationHosts(env = process.env) {
  const hosts = new Set(DEFAULT_ALLOW_NAVIGATION_HOSTS);
  const extras = String(env.CAP_ALLOW_NAVIGATION_HOSTS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  extras.forEach((h) => hosts.add(h));

  const flavor = normalizeCapAppEnv(env.CAP_APP_ENV);
  const prodUrl = (env.CAP_PROD_URL || env.CAP_SERVER_URL_PROD || '').trim() || DEFAULT_PROD_URL;
  const qaUrl = (env.CAP_QA_URL || env.CAP_SERVER_URL_QA || '').trim() || DEFAULT_QA_URL;
  const devUrl = (env.CAP_DEV_URL || env.CAP_SERVER_URL_DEV || '').trim() || getDefaultDevServerUrl();

  [prodUrl, qaUrl, devUrl].forEach((url) => {
    const host = hostnameFromUrl(url);
    if (host) hosts.add(host);
  });

  if (flavor === 'dev') {
    const host = hostnameFromUrl(devUrl);
    if (host) hosts.add(host);
  }

  return [...hosts];
}

function getCapacitorFlavorConfig(env = process.env) {
  const flavor = normalizeCapAppEnv(env.CAP_APP_ENV);
  const prodUrl = (env.CAP_PROD_URL || env.CAP_SERVER_URL_PROD || '').trim();
  const qaUrl = (env.CAP_QA_URL || env.CAP_SERVER_URL_QA || '').trim();
  const devUrl = (env.CAP_DEV_URL || env.CAP_SERVER_URL_DEV || '').trim() || getDefaultDevServerUrl();

  let resolved;
  switch (flavor) {
    case 'prod':
      resolved = {
        appId: 'co.thedailyscore.thedailyscore.prod',
        appName: 'The Daily Score',
        serverUrl: prodUrl || DEFAULT_PROD_URL,
      };
      break;
    case 'qa':
      resolved = {
        appId: 'co.thedailyscore.thedailyscore.qa',
        appName: 'The Daily Score QA',
        serverUrl: qaUrl || DEFAULT_QA_URL,
      };
      break;
    default:
      resolved = {
        appId: 'co.thedailyscore.thedailyscore.dev',
        appName: 'The Daily Score Dev',
        serverUrl: devUrl,
      };
      break;
  }

  const cleartext = /^http:\/\//i.test(resolved.serverUrl);

  return {
    flavor,
    appId: resolved.appId,
    appName: resolved.appName,
    serverUrl: resolved.serverUrl,
    cleartext,
    hostname: NATIVE_OAUTH_APP_HOST,
    allowNavigationHosts: getCapacitorAllowNavigationHosts(env),
  };
}

module.exports = {
  normalizeCapAppEnv,
  getCapacitorFlavorConfig,
  getCapacitorAllowNavigationHosts,
  getLanIPv4,
  getDefaultDevServerUrl,
  DEFAULT_PROD_URL,
  DEFAULT_QA_URL,
  LOCALHOST_DEV_URL,
  DEV_CLIENT_PORT,
  NATIVE_OAUTH_APP_HOST,
};
