const fs = require('fs');
const path = require('path');

describe('iOS launch screen', () => {
  const root = path.join(__dirname, '../..');

  test('centers the wordmark on paper', () => {
    const storyboard = fs.readFileSync(
      path.join(root, 'ios', 'App', 'App', 'Base.lproj', 'LaunchScreen.storyboard'),
      'utf8'
    );
    const mark = path.join(
      root,
      'ios',
      'App',
      'App',
      'Assets.xcassets',
      'LaunchMark.imageset',
      'LaunchMark.png'
    );
    expect(storyboard).toContain('image="LaunchMark"');
    expect(storyboard).toContain('red="0.984313725490196" green="0.9764705882352941" blue="0.9607843137254902"');
    expect(storyboard).not.toContain('image="Splash"');
    expect(fs.existsSync(mark)).toBe(true);
    expect(fs.existsSync(path.join(root, 'src', 'assets', 'the-daily-score-wordmark.png'))).toBe(true);
  });
});
