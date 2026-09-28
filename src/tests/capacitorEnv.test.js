const { getCapacitorFlavorConfig } = require('../../scripts/capacitor-env');

describe('capacitor flavors', () => {
  const baseEnv = {
    CAP_DEV_URL: 'http://10.0.0.8:3000',
    CAP_QA_URL: 'https://qa.thedailyscore.com',
    CAP_PROD_URL: 'https://thedailyscore.com',
  };

  test('dev bundle id is co.thedailyscore.thedailyscore.dev', () => {
    const config = getCapacitorFlavorConfig({ ...baseEnv, CAP_APP_ENV: 'dev' });
    expect(config.appId).toBe('co.thedailyscore.thedailyscore.dev');
    expect(config.appName).toBe('The Daily Score Dev');
    expect(config.hostname).toBe('thedailyscore.com');
  });

  test('qa and prod use their bundle ids', () => {
    expect(getCapacitorFlavorConfig({ ...baseEnv, CAP_APP_ENV: 'qa' }).appId).toBe(
      'co.thedailyscore.thedailyscore.qa'
    );
    expect(getCapacitorFlavorConfig({ ...baseEnv, CAP_APP_ENV: 'prod' }).appId).toBe(
      'co.thedailyscore.thedailyscore.prod'
    );
  });
});
