// NYT Wordle share. Guesses are the solve count. X/6 is saved unsolved, with no points score.

const parse = (text) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').trim().split('\n');
  const header = lines[0].trim().match(/^Wordle\s+([\d,]+)\s+([1-6Xx])\/6\*?$/);
  if (!header) return null;
  const puzzleNumber = Number(header[1].replace(/,/g, ''));
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 0) return null;
  const token = header[2].toUpperCase();
  const solved = token !== 'X';
  const snippet = lines
    .slice(1)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim())
    .join('\n');
  return {
    slug: 'wordle',
    puzzle_number: puzzleNumber,
    score: null,
    guesses: solved ? Number(token) : null,
    solved,
    snippet,
  };
};

module.exports = { slug: 'wordle', parse };
