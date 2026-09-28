#!/usr/bin/env node
/**
 * After `cap sync`, update Xcode PRODUCT_BUNDLE_IDENTIFIER / CFBundleDisplayName for CAP_APP_ENV.
 */

const fs = require('fs/promises');
const path = require('path');
const { getCapacitorFlavorConfig } = require('./capacitor-env');

function escapePlistAppName(appName) {
  return String(appName).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replaceProductBundleIdentifiers(pbxContent, appId) {
  return pbxContent.replace(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+)/g, `PRODUCT_BUNDLE_IDENTIFIER = ${appId}`);
}

function readProductBundleIdentifiers(pbxContent) {
  return [...pbxContent.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+)/g)].map((m) => m[1].trim());
}

function replaceCfBundleDisplayName(plistContent, appName) {
  const safe = escapePlistAppName(appName);
  return plistContent.replace(
    /(\t*)<key>CFBundleDisplayName<\/key>\s*\n\s*<string>([^<]*)<\/string>/,
    (_match, indent) => `${indent}<key>CFBundleDisplayName</key>\n${indent}<string>${safe}</string>`
  );
}

function readCfBundleDisplayName(plistContent) {
  const match = plistContent.match(/<key>CFBundleDisplayName<\/key>\s*\n\s*<string>([^<]*)<\/string>/);
  return match ? match[1].trim() : null;
}

const URL_SCHEME_BLOCK = `	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLName</key>
			<string>co.thedailyscore.thedailyscore</string>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>Thedailyscore</string>
			</array>
		</dict>
	</array>`;

function ensureDailyScoreUrlScheme(plistContent) {
  if (plistContent.includes('<string>Thedailyscore</string>')) return plistContent;
  if (plistContent.includes('<key>CFBundleURLTypes</key>')) return plistContent;
  return plistContent.replace(
    '</dict>\n</plist>',
    `${URL_SCHEME_BLOCK}\n</dict>\n</plist>`
  );
}

const ATS_BLOCK = `	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
		<key>NSAllowsLocalNetworking</key>
		<true/>
		<key>NSAllowsArbitraryLoadsInWebContent</key>
		<true/>
	</dict>`;

function ensureAppTransportSecurity(plistContent) {
  if (plistContent.includes('<key>NSAllowsArbitraryLoads</key>')) return plistContent;
  if (plistContent.includes('<key>NSAppTransportSecurity</key>')) {
    return plistContent.replace(
      /<key>NSAppTransportSecurity<\/key>\s*\n\s*<dict>[\s\S]*?<\/dict>/,
      ATS_BLOCK
    );
  }
  return plistContent.replace('</dict>\n</plist>', `${ATS_BLOCK}\n</dict>\n</plist>`);
}

function stripLocalNetworkPrivacy(plistContent) {
  return plistContent
    .replace(/\t*<key>NSLocalNetworkUsageDescription<\/key>\s*\n\s*<string>[^<]*<\/string>\s*\n/g, '')
    .replace(/\t*<key>NSBonjourServices<\/key>\s*\n\s*<array>[\s\S]*?<\/array>\s*\n/g, '');
}

function stripPhotoLibraryUsage(plistContent) {
  return plistContent
    .replace(/\t*<key>NSPhotoLibraryUsageDescription<\/key>\s*\n\s*<string>[^<]*<\/string>\s*\n/g, '')
    .replace(/\t*<key>NSPhotoLibraryAddUsageDescription<\/key>\s*\n\s*<string>[^<]*<\/string>\s*\n/g, '')
    .replace(/\t*<key>NSCameraUsageDescription<\/key>\s*\n\s*<string>[^<]*<\/string>\s*\n/g, '');
}

async function syncIosBundleSettings() {
  const { appId, appName, flavor } = getCapacitorFlavorConfig();
  const root = path.join(__dirname, '..');
  const pbxPath = path.join(root, 'ios/App/App.xcodeproj/project.pbxproj');
  const plistPath = path.join(root, 'ios/App/App/Info.plist');

  try {
    await fs.access(pbxPath);
  } catch {
    console.warn('[thedailyscore-bundle] iOS project not found. Run: npx cap add ios');
    return;
  }

  const pbx = await fs.readFile(pbxPath, 'utf8');
  const bundleIds = readProductBundleIdentifiers(pbx);
  const nextPbx = replaceProductBundleIdentifiers(pbx, appId);
  if (nextPbx !== pbx) await fs.writeFile(pbxPath, nextPbx, 'utf8');

  const plist = await fs.readFile(plistPath, 'utf8');
  const currentDisplayName = readCfBundleDisplayName(plist);
  let nextPlist = replaceCfBundleDisplayName(plist, appName);
  nextPlist = ensureDailyScoreUrlScheme(nextPlist);
  nextPlist = ensureAppTransportSecurity(nextPlist);
  nextPlist = stripLocalNetworkPrivacy(nextPlist);
  nextPlist = stripPhotoLibraryUsage(nextPlist);
  if (nextPlist !== plist) await fs.writeFile(plistPath, nextPlist, 'utf8');

  if (process.env.CAP_LOG_BUNDLE !== '0') {
    const bundleUpToDate = bundleIds.length > 0 && bundleIds.every((id) => id === appId);
    const displayUpToDate = currentDisplayName === appName;
    const status = bundleUpToDate && displayUpToDate ? 'already up to date' : 'updated';
    console.log(`[thedailyscore-bundle] Xcode bundle settings ${status}`, { flavor, appId, appName });
  }
}

if (require.main === module) {
  syncIosBundleSettings().catch((e) => {
    console.error('[thedailyscore-bundle] sync-ios-bundle-settings failed:', e.message);
    process.exit(1);
  });
}

module.exports = {
  escapePlistAppName,
  replaceProductBundleIdentifiers,
  readProductBundleIdentifiers,
  replaceCfBundleDisplayName,
  readCfBundleDisplayName,
  ensureDailyScoreUrlScheme,
  ensureAppTransportSecurity,
  stripLocalNetworkPrivacy,
  stripPhotoLibraryUsage,
  syncIosBundleSettings,
};
