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
    expect(scoreQueries.listGlobalRows).not.toMatch(/score_publications/);
    expect(scoreQueries.listGlobalRows).toMatch(/2021-06-19/);
    expect(scoreQueries.listGlobalRows).toMatch(/WHEN 'size-it-up' THEN '2026-08-10'/);
    expect(scoreQueries.listGlobalRows).toMatch(/2026-10-05/);
    expect(scoreQueries.listGlobalRows).toMatch(/2026-10-16/);
    expect(scoreQueries.listGlobalRows).toMatch(/WHEN 'fermi' THEN '2026-07-27'/);
    expect(scoreQueries.listGlobalRows).toMatch(/WHEN 'hivemind' THEN '2026-10-27'/);
    expect(scoreQueries.listGlobalRows).toMatch(/WHEN 'noillirk' THEN '2026-09-27'/);
    expect(scoreQueries.listPersonalBests).toMatch(/sort_direction = 'lower'/);
    expect(scoreQueries.listGlobalRows).toMatch(/\$2::int\[\] IS NULL/);
    expect(scoreQueries.listPuzzleBoard).toMatch(/solved = FALSE AND s\.guesses IS NOT NULL THEN 10000/);
    expect(scoreQueries.listPuzzleBoard).toMatch(/ELSE 7/);
    expect(scoreQueries.listLoggedTodayScores).toMatch(/u\.timezone/);
    expect(scoreQueries.listPuzzleBoard).toMatch(/s\.puzzle_number = \$2/);
    expect(scoreQueries.listDestinations).toMatch(/g\.archived = FALSE/);
    expect(scoreQueries.listDestinations).toMatch(/gg\.enabled = TRUE/);
    expect(scoreQueries.upsertScore).toMatch(/ON CONFLICT \(user_id, game_id, puzzle_number\) DO NOTHING/);
    expect(scoreQueries.upsertScore).not.toMatch(/DO UPDATE/);
  });
});
