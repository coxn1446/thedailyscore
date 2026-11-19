const mapTap = require('./mapTap');
const krillion = require('./krillion');
const sizeItUp = require('./sizeItUp');
const wordle = require('./wordle');
const redactle = require('./redactle');
const timeGuesser = require('./timeGuesser');
const semantle = require('./semantle');
const farflung = require('./farflung');
const eraly = require('./eraly');
const fermi = require('./fermi');
const hivemind = require('./hivemind');
const noillirk = require('./noillirk');

// A later game is a catalog row plus one module added here.
const parsers = new Map([
  [mapTap.slug, mapTap],
  [krillion.slug, krillion],
  [sizeItUp.slug, sizeItUp],
  [wordle.slug, wordle],
  [redactle.slug, redactle],
  [timeGuesser.slug, timeGuesser],
  [semantle.slug, semantle],
  [farflung.slug, farflung],
  [eraly.slug, eraly],
  [fermi.slug, fermi],
  [hivemind.slug, hivemind],
  [noillirk.slug, noillirk],
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
