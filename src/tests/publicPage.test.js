const fs = require('fs');
const path = require('path');

describe('public page', () => {
  test('does not advertise a link-preview image', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('https://thedailyscore.site');
    expect(html).not.toMatch(/og:image|twitter:image/);
  });
});
