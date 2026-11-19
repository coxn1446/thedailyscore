import { GAME_LINKS, gameMark } from '../helpers/gameCatalog';

describe('gameCatalog', () => {
  test('names the catalog games and their marks', () => {
    expect(GAME_LINKS.map((game) => [game.slug, game.mark, game.href])).toEqual([
      ['map-tap', '🌐', 'https://maptap.gg'],
      ['krillion', '🦐', 'https://krillion.io'],
      ['size-it-up', '📈', 'https://magnitudle.com/size-it-up'],
      ['wordle', '🟩', 'https://www.nytimes.com/games/wordle/index.html'],
      ['redactle', '⬛', 'https://redactle.net'],
      ['time-guesser', '🕰️', 'https://timeguessr.com'],
      ['semantle', '🔤', 'https://semantle.com'],
      ['farflung', '📍', 'https://farflung.game'],
      ['eraly', '⏳', 'https://eraly.io'],
      ['fermi', '🧮', 'https://fermi.gg'],
      ['hivemind', '🐝', 'https://playpindrop.app/hivemind'],
      ['noillirk', '🎈', 'https://noillirkgame.com/'],
    ]);
    expect(gameMark('krillion')).toBe('🦐');
    expect(gameMark('missing')).toBe('');
  });
});
