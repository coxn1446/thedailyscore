const { parsePaste, parsers } = require('../../server/parsers');
const { fixtures, now } = require('../../server/parsers/fixtures');

describe('score parsers', () => {
  test('registers one parser per catalog slug', () => {
    expect(parsers).toBeInstanceOf(Map);
    expect([...parsers.keys()]).toEqual(['map-tap', 'krillion', 'size-it-up', 'wordle']);
  });

  test.each(fixtures)('reads $slug puzzle $puzzle_number', (fixture) => {
    const parsed = parsePaste(fixture.paste, { now: fixture.now });
    expect(parsed).toMatchObject({
      slug: fixture.slug,
      puzzle_number: fixture.puzzle_number,
      score: fixture.score,
      guesses: fixture.guesses,
      solved: fixture.solved,
    });
    expect(parsed.snippet.length).toBeGreaterThan(0);
    if (fixture.slug === 'wordle') expect(parsed.score).toBeNull();
  });

  test('reads a one-line Map Tap share and an unsolved Wordle', () => {
    const map = parsePaste(
      'https://maptap.gg September 5 91🎯 98🔥 96🎯 77🎉 96🏅 Final score: 900 Antipode!',
      { now }
    );
    expect(map).toMatchObject({ slug: 'map-tap', puzzle_number: 806, score: 900, guesses: null });

    const missed = parsePaste('Wordle 50 X/6\n\n⬛⬛⬛⬛⬛', { now });
    expect(missed).toMatchObject({
      slug: 'wordle',
      puzzle_number: 50,
      score: null,
      guesses: null,
      solved: false,
    });
  });

  test('reads a Size It Up paste that has no puzzle number', () => {
    const paste = [
      'Size It Up',
      'Overall Score 282',
      '',
      '🟥🟥⬜⬜⬜ 48',
      '🟥⬜⬜⬜⬜ 11',
      '🟥🟥🟥🟥🟥 98',
      '🟥🟥🟥🟥⬜ 51',
      '🟥🟥🟥🟥⬜ 74',
      'https://magnitudle.com/size-it-up',
    ].join('\n');
    const evening = new Date('2026-09-28T02:30:00.000Z');
    const parsed = parsePaste(paste, { now: evening, timezone: 'America/New_York' });
    expect(parsed).toMatchObject({
      slug: 'size-it-up',
      puzzle_number: 20260927,
      played_on: '2026-09-27',
      score: 282,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toContain('98');
    expect(parsed.snippet).not.toContain('magnitudle');
    expect(parsed.snippet).not.toContain('Overall Score');

    const utc = parsePaste(paste, { now: evening, timezone: 'UTC' });
    expect(utc.puzzle_number).toBe(20260928);
    expect(utc.played_on).toBe('2026-09-28');
  });

  test('rejects a nonsense string', () => {
    expect(parsePaste('nothing to score here', { now })).toBeNull();
    expect(parsePaste('Krillion ∞ #4 🦐\n400', { now })).toBeNull();
    expect(parsePaste('Size It Up Unlimited · 100 / 200', { now })).toBeNull();
  });
});
