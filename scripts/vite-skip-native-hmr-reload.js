/**
 * Vite's HMR client full-reloads the page when the websocket drops.
 * iOS backgrounds WKWebView long enough for that socket to die, so
 * returning to the app remounts React. Reconnect HMR on Capacitor instead.
 */

const DISCONNECT_RELOAD = 'await waitForSuccessfulPing(url.href);\n          location.reload();';

const DISCONNECT_RECONNECT =
  'await waitForSuccessfulPing(url.href);\n' +
  '          if (typeof window !== "undefined" && window.Capacitor && typeof window.Capacitor.isNativePlatform === "function" && window.Capacitor.isNativePlatform()) {\n' +
  '            await transport.connect(createHMRHandler(handleMessage));\n' +
  '          } else {\n' +
  '            location.reload();\n' +
  '          }';

function isViteClientModule(id) {
  return (
    typeof id === 'string' &&
    (id.includes('vite/dist/client/client') || id.includes('/@vite/client'))
  );
}

function skipNativeDisconnectReload(code) {
  if (
    typeof code !== 'string' ||
    !code.includes('vite:ws:disconnect') ||
    !code.includes('waitForSuccessfulPing') ||
    !code.includes('location.reload()')
  ) {
    return code;
  }
  if (!code.includes(DISCONNECT_RELOAD)) return code;
  return code.replace(DISCONNECT_RELOAD, DISCONNECT_RECONNECT);
}

function capacitorSkipNativeHmrReload() {
  return {
    name: 'capacitor-skip-native-hmr-reload',
    apply: 'serve',
    transform(code, id) {
      if (!isViteClientModule(id)) return null;
      const next = skipNativeDisconnectReload(code);
      return next === code ? null : next;
    },
  };
}

module.exports = {
  DISCONNECT_RELOAD,
  DISCONNECT_RECONNECT,
  isViteClientModule,
  skipNativeDisconnectReload,
  capacitorSkipNativeHmrReload,
};
