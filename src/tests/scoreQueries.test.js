const fs = require('fs');
const path = require('path');
const scoreQueries = require('../../server/queries/scoreQueries');

const migration = fs.readFileSync(
  path.join(__dirname, '../../server/db/migrations/004_scores.sql'),
  'utf8'
);
const schema = fs.readFileSync(path.join(__dirname, '../../server/db/schema.sql'), 'utf8');

describe('score sql', () => {
  test('keeps one row per player, game, and puzzle', () => {
    for (const source of [schema, migration]) {
      expect(source).toContain('CREATE TABLE IF NOT EXISTS scores');
      expect(source).toContain('CREATE TABLE IF NOT EXISTS score_publications');
      expect(source).toContain('scores_user_game_puzzle_uidx');
      expect(source).toContain('ON scores (user_id, game_id, puzzle_number)');
      expect(source).toContain('scores_value_check');
    }
  });

  test('ranks a daily board from midnight in the group timezone', () => {
    expect(scoreQueries.listDailyBoard).toMatch(/AT TIME ZONE g\.timezone/);
    expect(scoreQueries.listDailyBoard).toMatch(/date_trunc\('day'/);
    expect(scoreQueries.listDailyBoard).toMatch(/ga\.resets_at/);
    expect(scoreQueries.listDailyBoard).toMatch(/s\.score IS NOT NULL/);
    expect(scoreQueries.listWeekRows).toMatch(/date_trunc\('week'/);
    expect(scoreQueries.listDayBoard).toMatch(/ga\.slug = \$2/);
    expect(scoreQueries.listDayBoard).toMatch(/\$3::int/);
    expect(scoreQueries.listGazette).toMatch(/gg\.enabled = TRUE OR s\.user_id = \$1/);
    expect(scoreQueries.countLoggedToday).toMatch(/u\.timezone/);
    expect(scoreQueries.listPersonalBests).not.toMatch(/group_games/);
    expect(scoreQueries.listPersonalBests).not.toMatch(/score_publications/);
    expect(scoreQueries.listPuzzleBoard).toMatch(/s\.solved = TRUE/);
    expect(scoreQueries.listPuzzleBoard).toMatch(/s\.puzzle_number = \$2/);
    expect(scoreQueries.listDestinations).toMatch(/g\.archived = FALSE/);
    expect(scoreQueries.listDestinations).toMatch(/gg\.enabled = TRUE/);
    expect(scoreQueries.upsertScore).toMatch(/ON CONFLICT \(user_id, game_id, puzzle_number\) DO NOTHING/);
    expect(scoreQueries.upsertScore).not.toMatch(/DO UPDATE/);
  });
});
