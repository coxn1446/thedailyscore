// Numbered share: "Size It Up #128 · 780/1000" then the five blocks.
// Dateless share: "Size It Up" / "Overall Score 282" and the blocks.
// A dateless paste uses the upload date as the puzzle id. Unlimited is not this board.

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

const snippetFrom = (lines) => lines
  .map((line) => line.trim())
  .filter((line) => line && !/^https?:\/\//i.test(line) && !/^Size It Up$/i.test(line) && !/^Overall Score\b/i.test(line))
  .join('\n');

const parseNumbered = (lines) => {
  const header = lines[0].trim().match(
    /^Size It Up(?:\s+(?!Unlimited\b)[A-Za-z][A-Za-z &]*?)?\s+#(\d+)\s+·\s+([\d,]+)\/[\d,]+\s*$/u
  );
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  const score = Number(header[2].replace(/,/g, ''));
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return null;
  if (!Number.isInteger(score) || score < 0) return null;
  return {
    slug: 'size-it-up',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet: snippetFrom(lines.slice(1)),
  };
};

const parseDateless = (lines, options) => {
  if (!/^Size It Up\s*$/i.test(lines[0].trim())) return null;
  const scoreLine = lines.find((line) => /^Overall Score\s+([\d,]+)\s*$/i.test(line.trim()));
  if (!scoreLine) return null;
  const score = Number(scoreLine.trim().match(/^Overall Score\s+([\d,]+)\s*$/i)[1].replace(/,/g, ''));
  if (!Number.isInteger(score) || score < 0) return null;
  const playedOn = uploadDay(options.now, options.timezone);
  const puzzleNumber = Number(playedOn.replace(/-/g, ''));
  if (!Number.isInteger(puzzleNumber)) return null;
  return {
    slug: 'size-it-up',
    puzzle_number: puzzleNumber,
    played_on: playedOn,
    score,
    guesses: null,
    solved: true,
    snippet: snippetFrom(lines),
  };
};

const parse = (text, options = {}) => {
  const raw = String(text || '');
  if (/Size It Up Unlimited/i.test(raw)) return null;
  const lines = raw.replace(/\r\n/g, '\n').trim().split('\n');
  if (!lines[0]) return null;
  return parseNumbered(lines) || parseDateless(lines, options);
};

module.exports = { slug: 'size-it-up', parse };
