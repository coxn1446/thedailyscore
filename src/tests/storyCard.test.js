import { Capacitor, registerPlugin } from '@capacitor/core';
import { STORY_STYLES, shareStory, storySpec } from '../helpers/storyCard';

const recap = {
  period: 'today',
  on: '2026-11-16',
  games: [
    { slug: 'krillion', name: 'Krillion', line: '355', rank: 1 },
    { slug: 'wordle', name: 'Wordle', line: '3/6', rank: 4 },
  ],
};

describe('story cards', () => {
  test('puts the recap and the site on every style', () => {
    for (const style of Object.keys(STORY_STYLES)) {
      const spec = storySpec(style === 'ink' ? { ...recap, period: 'week' } : recap, style);
      expect(spec.footer).toBe('thedailyscore.site');
      expect(spec.title).toBe('The Daily Score');
      expect(spec.lines.map((line) => line.text).join(' ')).toContain('Krillion 355');
      expect(spec.lines.map((line) => line.text).join(' ')).toContain('Wordle 3/6');
      expect(spec.rankHeader).toBe('Rank');
      expect(spec.colors.background).toBeTruthy();
    }
    expect(storySpec({ period: 'today', games: [{ slug: 'wordle', name: 'Wordle', line: '3/6' }] }).rankHeader).toBe('');
    expect(storySpec(recap, 'paper').colors.background).toBe('#FBF9F5');
    expect(storySpec(recap, 'paper').colors.ink).toBe('#111111');
    expect(storySpec(recap, 'ink').colors.background).toBe('#111111');
    expect(storySpec(recap, 'ink').colors.ink).toBe('#FBF9F5');
    expect(storySpec(recap, 'paper').kicker).toBe('Today');
    expect(storySpec({ ...recap, period: 'week' }, 'carmine').kicker).toBe('This week');
  });
});

const png = () => ({
  toBlob: (resolve) => resolve(new Blob(['png'], { type: 'image/png' })),
});

describe('story sharing', () => {
  const share = registerPlugin().share;

  afterEach(() => {
    Capacitor.getPlatform.mockReturnValue('web');
    share.mockReset();
    share.mockResolvedValue(undefined);
    delete navigator.share;
    delete navigator.canShare;
  });

  test('opens Instagram Stories with the png on iOS', async () => {
    Capacitor.getPlatform.mockReturnValue('ios');
    const result = await shareStory(png());
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      image: expect.any(String),
    });
    expect(share.mock.calls[0][0].image.length).toBeGreaterThan(0);
    expect(navigator.share).toBeUndefined();
  });

  test('uses the share sheet when this build has no Instagram handoff', async () => {
    Capacitor.getPlatform.mockReturnValue('ios');
    const err = new Error('not implemented');
    err.code = 'UNIMPLEMENTED';
    share.mockRejectedValue(err);
    const sheet = jest.fn(() => Promise.resolve());
    navigator.canShare = () => true;
    navigator.share = sheet;
    await expect(shareStory(png())).resolves.toBe('shared');
    expect(sheet).toHaveBeenCalledWith(expect.objectContaining({ title: 'The Daily Score' }));
  });

  test('reports when Instagram is not installed', async () => {
    Capacitor.getPlatform.mockReturnValue('ios');
    share.mockRejectedValue(new Error('Instagram is not installed'));
    await expect(shareStory(png())).rejects.toThrow('Instagram is not installed');
  });

  test('downloads the png when the sheet cannot take a file', async () => {
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => 'blob:story');
    URL.revokeObjectURL = jest.fn();
    await expect(shareStory(png())).resolves.toBe('downloaded');
    expect(share).not.toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    click.mockRestore();
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  test('fails when the canvas has no image', async () => {
    await expect(shareStory({ toBlob: (resolve) => resolve(null) })).resolves.toBe('failed');
  });
});
