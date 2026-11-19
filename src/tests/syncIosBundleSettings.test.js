const {
  ensureFacebookAppId,
  ensureInstagramStoriesScheme,
} = require('../../scripts/sync-ios-bundle-settings');

const plist = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>The Daily Score</string>
</dict>
</plist>
`;

describe('iOS bundle plist helpers', () => {
  test('adds the Instagram stories scheme once', () => {
    const once = ensureInstagramStoriesScheme(plist);
    expect(once).toContain('<string>instagram-stories</string>');
    expect(ensureInstagramStoriesScheme(once)).toBe(once);
  });

  test('writes a numeric Facebook app id and leaves other values alone', () => {
    const next = ensureFacebookAppId(plist, '123456');
    expect(next).toContain('<key>FacebookAppID</key>');
    expect(next).toContain('<string>123456</string>');
    expect(ensureFacebookAppId(next, '999')).toContain('<string>999</string>');
    expect(ensureFacebookAppId(next, '999')).not.toContain('<string>123456</string>');
    expect(ensureFacebookAppId(plist, 'not-an-id')).toBe(plist);
    expect(ensureFacebookAppId(next, '')).toBe(next);
  });
});
