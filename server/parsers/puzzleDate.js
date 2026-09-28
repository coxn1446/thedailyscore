// Puzzle numbers are the day the puzzle was posted, not the day it was pasted.
// Krillion #1 is 16 July 2026. Map Tap #0 is 21 June 2024.
// Wordle 1 is 19 June 2021. Size It Up #1 is 4 September 2026.

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
  if (slug === 'wordle') return addDays('2021-06-19', number - 1);
  if (slug === 'size-it-up') return addDays('2026-09-04', number - 1);
  return null;
};

module.exports = { puzzleDate };
