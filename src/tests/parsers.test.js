const { parsePaste, parsers } = require('../../server/parsers');
const { puzzleDate } = require('../../server/parsers/puzzleDate');
const { fixtures, now } = require('../../server/parsers/fixtures');

describe('score parsers', () => {
  test('registers one parser per catalog slug', () => {
    expect(parsers).toBeInstanceOf(Map);
    expect([...parsers.keys()]).toEqual(['map-tap', 'krillion', 'size-it-up', 'wordle', 'redactle', 'time-guesser', 'semantle', 'farflung', 'eraly', 'fermi', 'hivemind', 'noillirk']);
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

  test('reads the Magnitudle Size It Up card', () => {
    const paste = [
      'Magnitudle — Size It Up',
      '2026-11-03',
      '',
      'Score: 212/500',
      '',
      '🟥🟥🟥⬜⬜ 64',
      '🟥⬜⬜⬜⬜ 16',
      '🟥🟥⬜⬜⬜ 33',
      '🟥🟥🟥⬜⬜ 58',
      '🟥🟥⬜⬜⬜ 41',
      '',
      'https://magnitudle.com/size-it-up ',
    ].join('\n');
    const parsed = parsePaste(paste, { now, timezone: 'America/New_York' });
    expect(parsed).toMatchObject({
      slug: 'size-it-up',
      puzzle_number: 20261103,
      played_on: '2026-11-03',
      score: 212,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe([
      '🟥🟥🟥⬜⬜ 64',
      '🟥⬜⬜⬜⬜ 16',
      '🟥🟥⬜⬜⬜ 33',
      '🟥🟥🟥⬜⬜ 58',
      '🟥🟥⬜⬜⬜ 41',
    ].join('\n'));
    expect(parsePaste('Magnitudle — Size It Up\n2026-13-40\nScore: 10/500', { now })).toBeNull();
  });

  test('reads a Size It Up card that prints the puzzle number on its own line', () => {
    const paste = [
      'Size It Up',
      '#100',
      '',
      'Score: 96/500',
      '',
      '🟥🟥⬜⬜⬜ 49',
      '⬜⬜⬜⬜⬜ 4',
      '🟥⬜⬜⬜⬜ 14',
      '🟥⬜⬜⬜⬜ 29',
      '⬜⬜⬜⬜⬜ 0',
      '',
      'https://magnitudle.com/size-it-up',
    ].join('\n');
    const parsed = parsePaste(paste, { now, timezone: 'America/New_York' });
    expect(parsed).toMatchObject({
      slug: 'size-it-up',
      puzzle_number: 100,
      score: 96,
      guesses: null,
      solved: true,
    });
    expect(parsed.played_on).toBeUndefined();
    expect(puzzleDate('size-it-up', 1)).toBe('2026-08-10');
    expect(puzzleDate('size-it-up', 100)).toBe('2026-11-17');
    expect(parsed.snippet).toBe([
      '🟥🟥⬜⬜⬜ 49',
      '⬜⬜⬜⬜⬜ 4',
      '🟥⬜⬜⬜⬜ 14',
      '🟥⬜⬜⬜⬜ 29',
      '⬜⬜⬜⬜⬜ 0',
    ].join('\n'));
    expect(parsePaste('Size It Up\n#100\nOverall Score 10', { now })).toMatchObject({
      puzzle_number: 20260927,
      score: 10,
    });
    expect(parsePaste('Size It Up\nScore: 96/500', { now })).toBeNull();
  });

  test('maps a Wordle share number onto the NYT print date', () => {
    expect(puzzleDate('wordle', 1927)).toBe('2026-09-28');
    expect(puzzleDate('wordle', 0)).toBe('2021-06-19');
  });

  test('reads a solved Redactle and a give-up', () => {
    const solved = parsePaste(
      ['I cracked Redactle #1671 in 35 guesses!', '🎲 35 | 🔥 3 | Avg 28.15 | Hints: none | ⏱️ 5m19s'].join('\n'),
      { now }
    );
    expect(solved).toMatchObject({
      slug: 'redactle',
      puzzle_number: 1671,
      score: null,
      guesses: 35,
      solved: true,
      duration_seconds: 319,
      hints: 0,
    });
    expect(puzzleDate('redactle', 1)).toBe('2022-04-07');
    expect(puzzleDate('redactle', 1671)).toBe('2026-11-02');

    const gaveUp = parsePaste(
      ['I gave up on Redactle #1665 after 76 guesses.', '🎲 76 | 🔥 9 | Avg 38.38 | Hints👆3, 💬1 | ⏱️ 16m16s'].join('\n'),
      { now }
    );
    expect(gaveUp).toMatchObject({
      slug: 'redactle',
      puzzle_number: 1665,
      guesses: 76,
      solved: false,
      duration_seconds: 976,
      hints: 4,
    });
    expect(parsePaste('I cracked Redactle #10 in 4 guesses!\n🎲 9 | 🔥 1 | Avg 10 | Hints: none | ⏱️ 1m', { now })).toBeNull();
  });

  test('reads a Time Guesser share and drops the site link', () => {
    const paste = [
      'TimeGuessr #1258 — 21,347/50,000',
      '',
      '1️⃣ 🏆3,975 · 📅 20y · 🌍 761.4mi',
      '2️⃣ 🏆2,747 · 📅 19y · 🌍 1542.2mi',
      '3️⃣ 🏆5,572 · 📅 0y · 🌍 2350.9mi',
      '4️⃣ 🏆5,008 · 📅 0y · 🌍 5548.7mi',
      '5️⃣ 🏆4,045 · 📅 15y · 🌍 1040.6mi',
      '',
      'https://timeguessr.com',
    ].join('\n');
    const parsed = parsePaste(paste, { now });
    expect(parsed).toMatchObject({
      slug: 'time-guesser',
      puzzle_number: 1258,
      score: 21347,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe([
      '1️⃣ 🏆3,975 · 📅 20y · 🌍 761.4mi',
      '2️⃣ 🏆2,747 · 📅 19y · 🌍 1542.2mi',
      '3️⃣ 🏆5,572 · 📅 0y · 🌍 2350.9mi',
      '4️⃣ 🏆5,008 · 📅 0y · 🌍 5548.7mi',
      '5️⃣ 🏆4,045 · 📅 15y · 🌍 1040.6mi',
    ].join('\n'));
    expect(parsed.snippet).not.toContain('timeguessr.com');
    expect(puzzleDate('time-guesser', 1)).toBe('2023-06-01');
    expect(puzzleDate('time-guesser', 1258)).toBe('2026-11-09');
    expect(parsePaste('TimeGuessr #1258 - 21,347/50,000', { now })).toMatchObject({ score: 21347 });
    expect(parsePaste('TimeGuessr #1258 — 60,000/50,000', { now })).toBeNull();
    expect(parsePaste('TimeGuessr #1258 — 100/1000', { now })).toBeNull();
  });

  test('reads a Farflung share and drops the result link', () => {
    const parsed = parsePaste(
      ['Farflung #44 · 125/500 km', 'Uncommon · Miss · Miss · Rare · Miss', 'https://farflung.game/s/kvb4h2?e=44'].join('\n'),
      { now }
    );
    expect(parsed).toMatchObject({
      slug: 'farflung',
      puzzle_number: 44,
      score: 125,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe('Uncommon · Miss · Miss · Rare · Miss');
    expect(parsed.snippet).not.toContain('farflung.game');
    expect(puzzleDate('farflung', 1)).toBe('2026-10-05');
    expect(puzzleDate('farflung', 44)).toBe('2026-11-17');
    expect(parsePaste('Farflung #44 · 501/500 km', { now })).toBeNull();
    expect(parsePaste('Farflung #44 · 125/1000 km', { now })).toBeNull();
  });

  test('reads an Eraly share and keeps the bar and squares', () => {
    const parsed = parsePaste(
      ['Eraly #33 · I travelled to 1903 AD', '▰▰▰▰▰▰▰▱▱▱ 470/700', '🟨🟩🟧🟩🟨🟩🟩', 'https://eraly.io'].join('\n'),
      { now }
    );
    expect(parsed).toMatchObject({
      slug: 'eraly',
      puzzle_number: 33,
      score: 470,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe(['▰▰▰▰▰▰▰▱▱▱ 470/700', '🟨🟩🟧🟩🟨🟩🟩'].join('\n'));
    expect(parsed.snippet).not.toContain('eraly.io');
    expect(puzzleDate('eraly', 1)).toBe('2026-10-16');
    expect(puzzleDate('eraly', 33)).toBe('2026-11-17');
    expect(parsePaste('Eraly #33 · I travelled to 1903 AD', { now })).toBeNull();
    expect(parsePaste('Eraly #33 · I travelled to 1903 AD\n800/700', { now })).toBeNull();
    expect(parsePaste('Eraly #33 · I travelled to 1903 AD\n470/500', { now })).toBeNull();
  });

  test('reads a Fermi share and keeps the printed multiple', () => {
    const paste = [
      'Fermi · No. 115',
      '01 ↓ 2.80×',
      '02 ↓ 7.53×',
      '03 ↑ 16,667×',
      '─────────',
      '27.6× score · top 75%',
      '<https://fermi.gg/s/daily>',
    ].join('\n');
    const parsed = parsePaste(paste, { now });
    expect(parsed).toMatchObject({
      slug: 'fermi',
      puzzle_number: 115,
      score: 27.6,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toContain('16,667×');
    expect(parsed.snippet).not.toContain('fermi.gg');
    expect(parsed.snippet).not.toContain('27.6×');
    expect(puzzleDate('fermi', 1)).toBe('2026-07-27');
    expect(puzzleDate('fermi', 115)).toBe('2026-11-18');
    expect(puzzleDate('fermi', 116)).toBe('2026-11-19');

    const tight = parsePaste('Fermi · No. 5\n1.94× score\nfermi.gg', { now });
    expect(tight).toMatchObject({ slug: 'fermi', puzzle_number: 5, score: 1.94 });
    const capped = parsePaste('Fermi · No. 8\n1,000× score · top 1%', { now });
    expect(capped.score).toBe(1000);
    expect(parsePaste('Fermi · No. 8\n0.50× score', { now })).toBeNull();
    expect(parsePaste('Fermi · No. 8\n1,001× score', { now })).toBeNull();
    expect(parsePaste('Fermi · No. 8\n27.655× score', { now })).toBeNull();
  });

  test('reads a Hivemind share and keeps the honey total', () => {
    const paste = [
      '🐝 PlayPinDrop Hivemind #24',
      '⬡⬛🍯🟨🔍',
      '434 / 1000 · Forager',
      'https://playpindrop.app/hivemind?r=tbiv0i31',
    ].join('\n');
    const parsed = parsePaste(paste, { now });
    expect(parsed).toMatchObject({
      slug: 'hivemind',
      puzzle_number: 24,
      score: 434,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe('⬡⬛🍯🟨🔍\nForager');
    expect(parsed.snippet).not.toContain('playpindrop.app');
    expect(puzzleDate('hivemind', 1)).toBe('2026-10-27');
    expect(puzzleDate('hivemind', 24)).toBe('2026-11-19');

    const perfect = parsePaste('Hivemind #3\n🍯🍯🍯🍯✨\n1,000 / 1000 · Queen Bee', { now });
    expect(perfect).toMatchObject({ slug: 'hivemind', puzzle_number: 3, score: 1000 });
    expect(parsePaste('Hivemind #3\n1001 / 1000 · Queen Bee', { now })).toBeNull();
    expect(parsePaste('Hivemind #0\n0 / 1000 · Lost Drone', { now })).toBeNull();
    expect(parsePaste('Hivemind #3\n434 / 500 · Forager', { now })).toBeNull();
  });

  test('reads a Noillirk climb and keeps the altitude', () => {
    const classic = [
      'Noillirk - 1,922m',
      'THE LOW CLOUDS',
      '',
      '⬛🟨⬛⬛🟨⬛🟨',
      '',
      'https://noillirkgame.com/noillirk',
      'Site edition 65e5f0aa · classic',
    ].join('\n');
    const parsed = parsePaste(classic, { now });
    expect(parsed).toMatchObject({
      slug: 'noillirk',
      puzzle_number: 20260927,
      played_on: '2026-09-27',
      score: 1922,
      guesses: null,
      solved: true,
    });
    expect(parsed.snippet).toBe('THE LOW CLOUDS\n⬛🟨⬛⬛🟨⬛🟨');
    expect(parsed.snippet).not.toContain('noillirkgame.com');
    expect(parsed.snippet).not.toContain('Site edition');

    const daily = parsePaste([
      'Noillirk daily #54 - 14 km',
      'THE JET STREAM',
      '🟨🟨🟨🟨🟨🟨🟨',
      'Perfect climb. Every answer was the top answer.',
      'https://noillirkgame.com/noillirk',
      'Site edition 65e5f0aa · Daily 2026-11-19',
    ].join('\n'), { now });
    expect(daily).toMatchObject({ slug: 'noillirk', puzzle_number: 54, score: 14000 });
    expect(daily.played_on).toBeUndefined();
    expect(daily.snippet).toContain('Perfect climb');
    expect(puzzleDate('noillirk', 1)).toBe('2026-09-27');
    expect(puzzleDate('noillirk', 54)).toBe('2026-11-19');
    expect(parsePaste('Noillirk endless - 1,922m\nTHE LOW CLOUDS', { now })).toBeNull();
    expect(parsePaste('Noillirk daily - 1,922m', { now })).toBeNull();
  });

  test('rejects a nonsense string', () => {
    expect(parsePaste('nothing to score here', { now })).toBeNull();
    expect(parsePaste('Krillion ∞ #4 🦐\n400', { now })).toBeNull();
    expect(parsePaste('Size It Up Unlimited · 100 / 200', { now })).toBeNull();
  });
});
