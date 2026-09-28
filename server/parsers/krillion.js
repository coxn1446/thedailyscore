// Krillion daily share: "Krillion #74 🦐" then the depth, then the tier emoji.
// Archive repeats the same puzzle with a ⟲. Unlimited runs are not this board.

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(/^Krillion(?:\s+⟲)?\s+#(\d+)\s*🦐?(?:\s+(\d+))?(?:\s+(.+))?$/u);
  if (!header) return null;
  const puzzleNumber = Number(header[1]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return null;
  let score = header[2] != null && header[2] !== '' ? Number(header[2]) : null;
  const snippetLines = [];
  if (header[3]) snippetLines.push(header[3].trim());
  for (const line of lines.slice(1)) {
    const trimmed = line.trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed)) continue;
    if (score == null && /^\d+$/.test(trimmed)) {
      score = Number(trimmed);
      continue;
    }
    snippetLines.push(trimmed);
  }
  if (!Number.isInteger(score) || score < 0) return null;
  return {
    slug: 'krillion',
    puzzle_number: puzzleNumber,
    score,
    guesses: null,
    solved: true,
    snippet: snippetLines.join('\n'),
  };
};

module.exports = { slug: 'krillion', parse };
