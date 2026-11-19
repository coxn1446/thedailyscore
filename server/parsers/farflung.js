// Farflung daily share. Kilometres out of 500. Higher is better.
// #1 is 5 October 2026, so #44 is 17 November 2026.

const HEADER = /^Farflung\s+#(\d+)\s+·\s+([\d,]+)\s*\/\s*([\d,]+)\s*km\s*$/u;

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  const score = Number(header[2].replace(/,/g, ''));
  const maximum = Number(header[3].replace(/,/g, ''));
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  if (!Number.isInteger(score) || score < 0 || score > 500) return null;
  if (maximum !== 500) return null;
  const snippet = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !/^https?:\/\//i.test(line))
    .join('\n');
  return {
    slug: 'farflung',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'farflung', parse };
