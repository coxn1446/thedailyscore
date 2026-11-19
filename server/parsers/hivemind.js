// Hivemind daily share. Five rounds, each worth up to 200 honey.
// A full jar is 1,000. Higher wins. The rank name follows the total.
// #1 is 27 October 2026, so #24 is 19 November 2026.

const HEADER = /^(?:🐝\s*)?(?:PlayPinDrop\s+)?Hivemind\s+#(\d+)\s*$/u;
const SCORE = /^([\d,]+)\s*\/\s*1000\s*·\s*(.+)$/u;

const isLink = (line) => /^<?https?:\/\//i.test(line) || /^<?playpindrop\.app\b/i.test(line);

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(HEADER);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  const scoreLine = lines.slice(1).map((line) => line.trim()).find((line) => SCORE.test(line));
  if (!scoreLine) return null;
  const matched = scoreLine.match(SCORE);
  const score = Number(matched[1].replace(/,/g, ''));
  if (!Number.isInteger(score) || score < 0 || score > 1000) return null;
  const cells = lines
    .slice(1)
    .map((line) => line.trim())
    .filter((line) => line && !isLink(line) && line !== scoreLine.trim());
  const snippet = [...cells, matched[2].trim()].filter(Boolean).join('\n');
  return {
    slug: 'hivemind',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet,
  };
};

module.exports = { slug: 'hivemind', parse };
