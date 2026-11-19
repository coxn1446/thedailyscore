// Puzzle numbers are the day the puzzle was posted, not the day it was pasted.
// Krillion #1 is 16 July 2026. Map Tap #0 is 21 June 2024.
// Wordle’s share number is days since 19 June 2021, so Wordle 1927 is 28 September 2026.
// Size It Up #1 is 10 August 2026, so #100 is 17 November 2026.
// Redactle #1 is 7 April 2022.
// Time Guesser #1 is 1 June 2023, so #1258 is 9 November 2026.
// Semantle #1 is 29 January 2022.
// Farflung #1 is 5 October 2026, so #44 is 17 November 2026.
// Eraly #1 is 16 October 2026, so #33 is 17 November 2026.
// Fermi #1 is 27 July 2026, so #115 is 18 November 2026.
// Hivemind #1 is 27 October 2026, so #24 is 19 November 2026.
// Noillirk daily #1 is 27 September 2026, so #54 is 19 November 2026.

const addDays = (iso, days) => {
  const [year, month, day] = iso.split('-').map(Number);
  const stamp = Date.UTC(year, month - 1, day) + days * 86400000;
  const date = new Date(stamp);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const puzzleDate = (slug, puzzleNumber) => {
  const number = Number(puzzleNumber);
  if (!Number.isInteger(number)) return null;
  if (slug === 'krillion') return addDays('2026-07-16', number - 1);
  if (slug === 'map-tap') return addDays('2024-06-21', number);
  if (slug === 'wordle') return addDays('2021-06-19', number);
  if (slug === 'size-it-up') return addDays('2026-08-10', number - 1);
  if (slug === 'redactle') return addDays('2022-04-07', number - 1);
  if (slug === 'time-guesser') return addDays('2023-06-01', number - 1);
  if (slug === 'semantle') return addDays('2022-01-29', number - 1);
  if (slug === 'farflung') return addDays('2026-10-05', number - 1);
  if (slug === 'eraly') return addDays('2026-10-16', number - 1);
  if (slug === 'fermi') return addDays('2026-07-27', number - 1);
  if (slug === 'hivemind') return addDays('2026-10-27', number - 1);
  if (slug === 'noillirk') return addDays('2026-09-27', number - 1);
  return null;
};

module.exports = { puzzleDate };
