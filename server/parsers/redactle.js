// Redactle share. Fewer guesses is better. A give-up still reports its guess count.
// Hints are the sum of every hint type on the line. Time is stored in seconds.

const HEADER = /^(?:I cracked Redactle #(\d+) in (\d+) guesses!|I gave up on Redactle #(\d+) after (\d+) guesses\.)$/;

const parseDuration = (part) => {
  const tokens = part.match(/\d+h|\d+m|\d+s/g);
  if (!tokens) return null;
  let seconds = 0;
  for (const token of tokens) {
    const count = Number.parseInt(token, 10);
    if (token.endsWith('h')) seconds += count * 3600;
    else if (token.endsWith('m')) seconds += count * 60;
    else seconds += count;
  }
  return seconds;
};

const parseHints = (part) => {
  const text = part.trim();
  if (!/^hints\b/i.test(text)) return null;
  if (/^hints:\s*none$/i.test(text)) return 0;
  const counts = [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (!counts.length) return null;
  return counts.reduce((sum, count) => sum + count, 0);
};

const parse = (text) => {
  const lines = String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;
  const header = lines[0].match(HEADER);
  if (!header) return null;
  const solved = Boolean(header[1]);
  const puzzleNumber = Number(solved ? header[1] : header[3]);
  const guesses = Number(solved ? header[2] : header[4]);
  if (!Number.isInteger(puzzleNumber) || puzzleNumber < 1) return null;
  if (!Number.isInteger(guesses) || guesses < 1) return null;
  const statsLine = lines.slice(1).find((line) => line.includes('🎲'));
  if (!statsLine) return null;
  const parts = statsLine.split('|').map((part) => part.trim());
  const dice = parts.find((part) => part.includes('🎲'));
  const diceCount = dice ? Number((dice.match(/\d+/) || [])[0]) : NaN;
  if (diceCount !== guesses) return null;
  const hints = parts.map(parseHints).find((value) => value != null);
  const duration = parts.map(parseDuration).find((value) => value != null);
  if (hints == null || duration == null) return null;
  return {
    slug: 'redactle',
    puzzle_number: puzzleNumber,
    score: null,
    guesses,
    solved,
    duration_seconds: duration,
    hints,
    snippet: statsLine,
  };
};

module.exports = { slug: 'redactle', parse };
