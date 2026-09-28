const { getCapacitorFlavorConfig } = require('./scripts/capacitor-env');

const { appId, appName, serverUrl, cleartext, hostname, allowNavigationHosts } =
  getCapacitorFlavorConfig();

/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId,
  appName,
  webDir: 'build',
  server: {
    url: serverUrl,
    cleartext,
    hostname,
    allowNavigation: allowNavigationHosts,
  },
  plugins: {
    Keyboard: {
      resize: 'none',
      style: 'light',
      resizeOnFullScreen: true,
    },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: false,
      backgroundColor: '#FBF9F5',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FBF9F5',
      overlaysWebView: true,
    },
  },
  ios: {
    contentInset: 'never',
    limitsNavigationsToAppBoundDomains: false,
    scheme: 'Thedailyscore',
    backgroundColor: '#FBF9F5',
  },
};

module.exports = config;
