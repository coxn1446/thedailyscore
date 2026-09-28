const fs = require('fs');
const path = require('path');
const groupQueries = require('../../server/queries/groupQueries');

const migration = fs.readFileSync(
  path.join(__dirname, '../../server/db/migrations/003_game_catalog.sql'),
  'utf8'
);
const schema = fs.readFileSync(path.join(__dirname, '../../server/db/schema.sql'), 'utf8');

describe('group catalog sql', () => {
  test('seeds the four MVP games and their boards', () => {
    const tuples = [
      "('map-tap', 'Map Tap', 'higher', 'score', 'daily', NULL, '00:00', 1)",
      "('krillion', 'Krillion', 'higher', 'score', 'daily', NULL, '00:00', 2)",
      "('size-it-up', 'Size it Up', 'higher', 'score', 'daily', NULL, '00:00', 3)",
      "('wordle', 'Wordle', 'lower', 'guesses', 'weekly', 4, '00:00', 4)",
    ];
    for (const tuple of tuples) {
      expect(schema).toContain(tuple);
    }
    expect(migration).toContain("rank_basis = 'score'");
    expect(migration).toContain("rank_basis = 'guesses'");
    expect(migration).toContain('min_entries = 4');
    expect(migration).toContain("'size-it-up', 'Size it Up'");
    expect(schema).not.toContain('Connections');
    expect(schema).not.toContain('Nerdle');
  });

  test('directories hide archived groups and game toggles update rows', () => {
    expect(groupQueries.listMine).toMatch(/g\.archived = FALSE/);
    expect(groupQueries.listArchived).toMatch(/g\.archived = TRUE/);
    expect(groupQueries.listArchived).toMatch(/m\.role = 'curator'/);
    expect(groupQueries.renameGroup).toMatch(/SET name = \$2/);
    expect(groupQueries.unarchiveGroup).toMatch(/archived = FALSE/);
    expect(groupQueries.listGames).toMatch(/rank_basis/);
    expect(groupQueries.listGroupGames).toMatch(/rank_basis/);
    expect(groupQueries.setGroupGameEnabled).toMatch(/UPDATE group_games/);
    expect(groupQueries.setGroupGameEnabled).not.toMatch(/DELETE/i);
    expect(groupQueries.findUserByExactHandle).toMatch(/handle = \$1/);
    expect(groupQueries.findUserByExactHandle).not.toMatch(/LIKE/i);
  });
});