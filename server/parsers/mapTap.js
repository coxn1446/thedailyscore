// MapTap daily share. Puzzle number is calendar days since 21 June 2024 (puzzle 0).
// https://maptap.gg — getScoreText()

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  sept: 8,
  october: 9,
  november: 10,
  december: 11,
};

const EPOCH = Date.UTC(2024, 5, 21);

const daysSinceEpoch = (year, monthIndex, day) => {
  const stamp = Date.UTC(year, monthIndex, day);
  const probe = new Date(stamp);
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== monthIndex || probe.getUTCDate() !== day) {
    return null;
  }
  return Math.round((stamp - EPOCH) / 86400000);
};

const puzzleNumberFor = (monthIndex, day, now) => {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  let chosen = null;
  for (const year of [now.getUTCFullYear(), now.getUTCFullYear() - 1]) {
    const number = daysSinceEpoch(year, monthIndex, day);
    if (number == null || number < 0) continue;
    const stamp = Date.UTC(year, monthIndex, day);
    if ((stamp - today) / 86400000 > 1) continue;
    if (!chosen || stamp > chosen.stamp) chosen = { number, stamp };
  }
  return chosen ? chosen.number : null;
};

const parse = (text, { now = new Date() } = {}) => {
  const raw = String(text || '').trim();
  const header = raw.match(/^(?:https?:\/\/)?(?:www\.)?maptap\.gg\s+([A-Za-z]+)\s+(\d{1,2})\b/i)
    || raw.match(/^Map\s*Tap\s+([A-Za-z]+)\s+(\d{1,2})\b/i);
  if (!header) return null;
  const scoreMatch = raw.match(/Final score:\s*(\d+)/i);
  if (!scoreMatch) return null;
  const monthIndex = MONTHS[header[1].toLowerCase()];
  const day = Number(header[2]);
  if (monthIndex == null || day < 1 || day > 31) return null;
  const puzzleNumber = puzzleNumberFor(monthIndex, day, now);
  if (puzzleNumber == null) return null;
  const afterHeader = raw.slice(header.index + header[0].length);
  const scoreAt = afterHeader.search(/Final score:/i);
  const snippet = afterHeader.slice(0, scoreAt).trim();
  return {
    slug: 'map-tap',
    puzzle_number: puzzleNumber,
    score: Number(scoreMatch[1]),
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'map-tap', parse };
