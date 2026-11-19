#!/usr/bin/env node
/**
 * Copy the flavor-specific GoogleService-Info.plist into ios/App/App/ so the
 * Firebase iOS app BUNDLE_ID matches CAP_APP_ENV.
 *
 * Source files (gitignored under secrets/):
 *   secrets/GoogleService-Info.prod.plist
 *   secrets/GoogleService-Info.qa.plist
 *   secrets/GoogleService-Info.dev.plist
 *
 * Run after `cap sync` as part of `npm run s:prod|s:qa|s:dev`.
 */

const fs = require('fs/promises');
const path = require('path');

const { getCapacitorFlavorConfig } = require('./capacitor-env');

function readPlistBundleId(plistContent) {
  const match = String(plistContent).match(
    /<key>BUNDLE_ID<\/key>\s*\n\s*<string>([^<]*)<\/string>/
  );
  return match ? match[1].trim() : null;
}

/**
 * @param {{ flavor?: string, appId?: string, rootDir?: string, env?: NodeJS.ProcessEnv }} [options]
 */
async function syncIosGoogleServiceInfo(options = {}) {
  const env = options.env || process.env;
  const flavorConfig = getCapacitorFlavorConfig(env);
  const flavor = options.flavor || flavorConfig.flavor;
  const appId = options.appId || flavorConfig.appId;
  const root = options.rootDir || path.join(__dirname, '..');

  const sourcePath = path.join(root, 'secrets', `GoogleService-Info.${flavor}.plist`);
  const destPath = path.join(root, 'ios/App/App/GoogleService-Info.plist');

  let source;
  try {
    source = await fs.readFile(sourcePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      throw new Error(
        `[thedailyscore-firebase] Missing ${path.relative(root, sourcePath)}. ` +
          `Save the Firebase iOS config for bundle ID ${appId} there, then re-run npm run s:${flavor}.`
      );
    }
    throw error;
  }

  const bundleId = readPlistBundleId(source);
  if (!bundleId) {
    throw new Error(
      `[thedailyscore-firebase] ${path.relative(root, sourcePath)} has no BUNDLE_ID entry`
    );
  }
  if (bundleId !== appId) {
    throw new Error(
      `[thedailyscore-firebase] ${path.relative(root, sourcePath)} BUNDLE_ID is ${bundleId}, ` +
        `expected ${appId} for CAP_APP_ENV=${flavor}`
    );
  }

  await fs.mkdir(path.dirname(destPath), { recursive: true });
  await fs.writeFile(destPath, source, 'utf8');

  if (env.CAP_LOG_BUNDLE !== '0') {
    console.log('[thedailyscore-firebase] GoogleService-Info.plist synced', {
      flavor,
      appId,
      source: path.relative(root, sourcePath),
    });
  }

  return { flavor, appId, sourcePath, destPath, bundleId };
}

if (require.main === module) {
  syncIosGoogleServiceInfo().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}

module.exports = {
  readPlistBundleId,
  syncIosGoogleServiceInfo,
};
