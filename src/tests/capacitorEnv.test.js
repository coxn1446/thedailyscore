const { getCapacitorFlavorConfig } = require('../../scripts/capacitor-env');

describe('capacitor flavors', () => {
  const baseEnv = {
    CAP_DEV_URL: 'http://10.0.0.8:3000',
    CAP_QA_URL: 'https://qa.thedailyscore.site',
    CAP_PROD_URL: 'https://thedailyscore.site',
  };

  test('dev bundle id is site.thedailyscore.dev', () => {
    const config = getCapacitorFlavorConfig({ ...baseEnv, CAP_APP_ENV: 'dev' });
    expect(config.appId).toBe('site.thedailyscore.dev');
    expect(config.appName).toBe('The Daily Score Dev');
    expect(config.hostname).toBe('thedailyscore.com');
  });

  test('dev server defaults to the studio LAN address', () => {
    const config = getCapacitorFlavorConfig({ CAP_APP_ENV: 'dev' });
    expect(config.serverUrl).toBe('http://192.168.1.171:3000');
    expect(config.cleartext).toBe(true);
    expect(config.allowNavigationHosts).toContain('192.168.1.171');
  });

  test('qa and prod use their bundle ids and public hosts', () => {
    const qa = getCapacitorFlavorConfig({ CAP_APP_ENV: 'qa' });
    const prod = getCapacitorFlavorConfig({ CAP_APP_ENV: 'prod' });
    expect(qa.appId).toBe('site.thedailyscore.qa');
    expect(qa.serverUrl).toBe('https://qa.thedailyscore.site');
    expect(prod.appId).toBe('site.thedailyscore.prod');
    expect(prod.serverUrl).toBe('https://thedailyscore.site');
  });
});
