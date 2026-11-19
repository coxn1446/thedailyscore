// Noillirk share. The first line is the altitude. Higher wins.
// Daily is "Noillirk daily #N". #1 is 27 September 2026, so #54 is 19 November 2026.
// Classic has no shared puzzle, so it files on the upload day.
// Endless is a survival run and is not this board.

const HEADER = /^Noillirk(?: (endless|daily)(?: #(\d+))?)? - ([\d,]+(?:\.\d+)?)(m| km)$/u;
const EDITION = /^(?:Site edition [0-9a-f]{4,}|Recovered-board matching \(legacy\)) · /i;

const uploadDay = (now, timeZone) => {
  const date = now instanceof Date ? now : new Date(now || Date.now());
  const zone = typeof timeZone === 'string' && timeZone.trim() ? timeZone.trim() : 'UTC';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;
    if (!year || !month || !day) return date.toISOString().slice(0, 10);
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

const isLink = (line) => /^<?https?:\/\//i.test(line) || /^<?(?:www\.)?(?:noillirkgame\.com|playdaily\.org)\b/i.test(line);

const metersOf = (raw, unit) => {
  const value = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(value) || value < 0) return null;
  const meters = Math.round(unit === ' km' ? value * 1000 : value);
  if (!Number.isInteger(meters) || meters > 1000000) return null;
  return meters;
};

const parse = (text, options = {}) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  if (header[1] === 'endless') return null;
  if (header[1] === 'daily' && !header[2]) return null;
  const score = metersOf(header[3], header[4]);
  if (score == null) return null;
  const snippet = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !isLink(line) && !EDITION.test(line))
    .join('\n');
  if (header[1] === 'daily') {
    const puzzleNumber = Number(header[2]);
    if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
    return {
      slug: 'noillirk',
      puzzle_number: puzzleNumber,
      score,
      guesses: null,
      solved: true,
      snippet,
    };
  }
  const playedOn = uploadDay(options.now, options.timezone);
  const puzzleNumber = Number(playedOn.replace(/-/g, ''));
  if (!Number.isInteger(puzzleNumber)) return null;
  return {
    slug: 'noillirk',
    puzzle_number: puzzleNumber,
    played_on: playedOn,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'noillirk', parse };
