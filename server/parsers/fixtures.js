// Real share shapes. Map Tap's puzzle number is days since 21 June 2024.
// June 28 2026 is puzzle 737 when `now` is 27 September 2026.

const now = new Date('2026-09-27T15:00:00.000Z');

const fixtures = [
  {
    slug: 'map-tap',
    puzzle_number: 737,
    score: 956,
    guesses: null,
    solved: true,
    now,
    paste: ['www.maptap.gg June 28', '96🔥 96🔥 100🎯 93🏆 95🏅', 'Final score: 956'].join('\n'),
  },
  {
    slug: 'krillion',
    puzzle_number: 74,
    score: 355,
    guesses: null,
    solved: true,
    now,
    paste: ['Krillion #74 🦐', '355', '', '🐟🫧🏮🏮🐟🐟🏮', '', 'https://krillion.io'].join('\n'),
  },
  {
    slug: 'size-it-up',
    puzzle_number: 128,
    score: 780,
    guesses: null,
    solved: true,
    now,
    paste: ['Size It Up #128 · 780/1000', '🟩🟨🟧🟩🟥', 'https://sizeitup.games/'].join('\n'),
  },
  {
    slug: 'wordle',
    puzzle_number: 1234,
    score: null,
    guesses: 3,
    solved: true,
    now,
    paste: ['Wordle 1,234 3/6', '', '🟩⬛⬛⬛🟨', '🟩🟩⬛🟨⬛', '🟩🟩🟩🟩🟩'].join('\n'),
  },
];

module.exports = { now, fixtures };
