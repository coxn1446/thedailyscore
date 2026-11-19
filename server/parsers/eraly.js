// Eraly daily share. Points out of 700. Higher is better.
// #1 is 16 October 2026, so #33 is 17 November 2026.
// The year in the header changes with the score. The points sit on the bar line.

const HEADER = /^Eraly\s+#(\d+)\s+·\s+\S/u;
const SCORE = /([\d,]+)\s*\/\s*700\s*$/;

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  const scoreLine = lines.slice(1).map((line) => line.trim()).find((line) => SCORE.test(line));
  if (!scoreLine) return null;
  const score = Number(scoreLine.match(SCORE)[1].replace(/,/g, ''));
  if (!Number.isInteger(score) || score < 0 || score > 700) return null;
  const snippet = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !/^https?:\/\//i.test(line))
    .join('\n');
  return {
    slug: 'eraly',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'eraly', parse };
