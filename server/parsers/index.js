const mapTap = require('./mapTap');
const krillion = require('./krillion');
const sizeItUp = require('./sizeItUp');
const wordle = require('./wordle');

// A later game is a catalog row plus one module added here.
const parsers = new Map([
  [mapTap.slug, mapTap],
  [krillion.slug, krillion],
  [sizeItUp.slug, sizeItUp],
  [wordle.slug, wordle],
]);

const parsePaste = (text, options = {}) => {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;
  const found = [];
  for (const parser of parsers.values()) {
    const result = parser.parse(trimmed, options);
    if (result) found.push(result);
  }
  if (found.length !== 1) return null;
  return found[0];
};

module.exports = { parsers, parsePaste };
