// Semantle share. Fewer guesses is better. A give-up still reports its guess count.
// #1 is 29 January 2022.

const HEADER = /^Semantle #(\d+)$/;
const GUESSES = /^(✅|❌)\s+(\d+)\s+Guesses$/u;
const HINTS = /^💡\s+(\d+)\s+Hints$/u;

const parse = (text) => {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\uFE0F/g, '')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const header = lines[0]?.match(HEADER);
  const guessLine = lines.map((line) => line.match(GUESSES)).find(Boolean);
  if (!header || !guessLine) return null;
  const puzzleNumber = Number(header[1]);
  const guesses = Number(guessLine[2]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  if (!Number.isInteger(guesses) || guesses < 1) return null;
  const hintsLine = lines.map((line) => line.match(HINTS)).find(Boolean);
  const hints = hintsLine ? Number(hintsLine[1]) : 0;
  if (!Number.isInteger(hints) || hints < 0) return null;
  const snippet = lines
    .slice(1)
    .filter((line) => !/semantle\.com/i.test(line))
    .join('\n');
  return {
    slug: 'semantle',
    puzzle_number: puzzleNumber,
    score: null,
    guesses,
    solved: guessLine[1] === '✅',
    hints,
    snippet,
  };
};

module.exports = { slug: 'semantle', parse };
