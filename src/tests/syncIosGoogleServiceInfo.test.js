const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const {
  readPlistBundleId,
  syncIosGoogleServiceInfo,
} = require('../../scripts/sync-ios-google-service-info');

const plistFor = (bundleId) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>BUNDLE_ID</key>
	<string>${bundleId}</string>
</dict>
</plist>
`;

describe('syncIosGoogleServiceInfo', () => {
  let rootDir;

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tds-firebase-'));
    await fs.mkdir(path.join(rootDir, 'secrets'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(rootDir, { recursive: true, force: true });
  });

  test('reads the BUNDLE_ID string', () => {
    expect(readPlistBundleId(plistFor('site.thedailyscore.qa'))).toBe('site.thedailyscore.qa');
    expect(readPlistBundleId('<plist></plist>')).toBeNull();
  });

  test('copies the flavor plist when its bundle id matches', async () => {
    await fs.writeFile(
      path.join(rootDir, 'secrets', 'GoogleService-Info.qa.plist'),
      plistFor('site.thedailyscore.qa')
    );

    const result = await syncIosGoogleServiceInfo({
      rootDir,
      flavor: 'qa',
      appId: 'site.thedailyscore.qa',
      env: { CAP_LOG_BUNDLE: '0' },
    });

    const copied = await fs.readFile(result.destPath, 'utf8');
    expect(result.bundleId).toBe('site.thedailyscore.qa');
    expect(copied).toContain('site.thedailyscore.qa');
  });

  test('fails when the flavor plist is missing', async () => {
    await expect(
      syncIosGoogleServiceInfo({
        rootDir,
        flavor: 'dev',
        appId: 'site.thedailyscore.dev',
        env: { CAP_LOG_BUNDLE: '0' },
      })
    ).rejects.toThrow(/Missing secrets\/GoogleService-Info\.dev\.plist/);
  });

  test('fails when the plist bundle id belongs to another flavor', async () => {
    await fs.writeFile(
      path.join(rootDir, 'secrets', 'GoogleService-Info.prod.plist'),
      plistFor('site.thedailyscore.qa')
    );

    await expect(
      syncIosGoogleServiceInfo({
        rootDir,
        flavor: 'prod',
        appId: 'site.thedailyscore.prod',
        env: { CAP_LOG_BUNDLE: '0' },
      })
    ).rejects.toThrow(/BUNDLE_ID is site\.thedailyscore\.qa/);
  });
});
