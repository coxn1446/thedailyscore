// Numbered share: "Size It Up #128 · 780/1000" then the five blocks.
// Dateless share: "Size It Up" / "Overall Score 282" and the blocks.
// Edition card: "Size It Up", then "#100", then "Score: 96/500", then the five blocks.
// #1 is 10 August 2026, so #100 is 17 November 2026.
// Magnitudle card: "Magnitudle — Size It Up", the puzzle date, and "Score: 212/500".
// A dateless paste uses the upload date as the puzzle id. The edition card uses #N.
// The Magnitudle card uses its printed date.
// Unlimited is not this board.

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
  .filter((line) => line
    && !/^https?:\/\//i.test(line)
    && !/^Size It Up$/i.test(line)
    && !/^Magnitudle\b/i.test(line)
    && !/^Overall Score\b/i.test(line)
    && !/^Score:\s/i.test(line)
    && !/^#\d+$/.test(line)
    && !/^\d{4}-\d{2}-\d{2}$/.test(line))
  .join('\n');

const isoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return value;
};

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

const parseEdition = (lines) => {
  if (!/^Size It Up\s*$/i.test(lines[0].trim())) return null;
  const edition = lines.map((line) => line.trim()).find((line) => /^#(\d+)\s*$/.test(line));
  const scoreLine = lines.map((line) => line.trim()).find((line) => /^Score:\s*[\d,]+\s*\/\s*[\d,]+\s*$/i.test(line));
  if (!edition || !scoreLine) return null;
  const puzzleNumber = Number(edition.match(/^#(\d+)/)[1]);
  const score = Number(scoreLine.match(/^Score:\s*([\d,]+)/i)[1].replace(/,/g, ''));
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return null;
  if (!Number.isInteger(score) || score < 0) return null;
  return {
    slug: 'size-it-up',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet: snippetFrom(lines),
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

const parseMagnitudle = (lines) => {
  if (!/^Magnitudle\s+.+Size It Up\s*$/i.test(lines[0].trim())) return null;
  const trimmed = lines.map((line) => line.trim()).filter(Boolean);
  const playedOn = isoDate(trimmed.find((line) => isoDate(line)) || '');
  const scoreLine = trimmed.find((line) => /^Score:\s*[\d,]+\s*\/\s*[\d,]+\s*$/i.test(line));
  if (!playedOn || !scoreLine) return null;
  const score = Number(scoreLine.match(/^Score:\s*([\d,]+)/i)[1].replace(/,/g, ''));
  if (!Number.isInteger(score) || score < 0) return null;
  return {
    slug: 'size-it-up',
    puzzle_number: Number(playedOn.replace(/-/g, '')),
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
  return parseNumbered(lines) || parseEdition(lines) || parseDateless(lines, options) || parseMagnitudle(lines);
};

module.exports = { slug: 'size-it-up', parse };
