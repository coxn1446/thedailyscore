// TimeGuessr daily share. Points out of 50,000. Higher is better.
// #1 is 1 June 2023, so #1258 is 9 November 2026.

const HEADER = /^TimeGuessr\s+#(\d+)\s+[—–-]\s+([\d,]+)\s*\/\s*([\d,]+)\s*$/u;

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  const score = Number(header[2].replace(/,/g, ''));
  const maximum = Number(header[3].replace(/,/g, ''));
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  if (!Number.isInteger(score) || score < 0 || score > 50000) return null;
  if (maximum !== 50000) return null;
  const snippet = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !/^https?:\/\//i.test(line))
    .join('\n');
  return {
    slug: 'time-guesser',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'time-guesser', parse };
