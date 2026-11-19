// Fermi daily share. Three estimates. Each multiple is how many times off
// the real answer, capped at 1,000×. The printed score is the geometric mean
// of those three, also capped at 1,000×. 1× is perfect. Lower wins.
// #1 is 27 July 2026, so #115 is 18 November 2026.

const HEADER = /^Fermi\s+·\s+No\.\s+(\d+)\s*$/u;
const SCORE = /^([\d,]+(?:\.\d{1,2})?)\u00d7\s+score(?:\s+·\s+top\s+\d+%)?\s*$/u;

const isLink = (line) => /^<?https?:\/\//i.test(line) || /^<?fermi\.gg\b/i.test(line);

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  const scoreLine = lines.slice(1).map((line) => line.trim()).find((line) => SCORE.test(line));
  if (!scoreLine) return null;
  const score = Math.round(Number(scoreLine.match(SCORE)[1].replace(/,/g, '')) * 100) / 100;
  if (!Number.isFinite(score) || score < 1 || score > 1000) return null;
  const body = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !isLink(line) && !SCORE.test(line));
  const snippet = body.join('\n') || scoreLine.trim();
  return {
    slug: 'fermi',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'fermi', parse };
