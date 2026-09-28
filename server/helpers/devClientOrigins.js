/**
 * Extra browser/WebView origins allowed in development (Express CORS, Socket.io).
 * Use DEV_CLIENT_ORIGINS for Capacitor live reload (e.g. https://192.168.1.10:3000).
 */

function parseDevClientOriginsFromString(raw) {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDevClientOrigins() {
  return parseDevClientOriginsFromString(process.env.DEV_CLIENT_ORIGINS);
}

function getDevelopmentClientOrigins() {
  return [
    'https://localhost:3000',
    'http://localhost:3000',
    'capacitor://localhost',
    'ionic://localhost',
    ...parseDevClientOrigins(),
  ];
}

module.exports = {
  parseDevClientOriginsFromString,
  parseDevClientOrigins,
  getDevelopmentClientOrigins,
};
