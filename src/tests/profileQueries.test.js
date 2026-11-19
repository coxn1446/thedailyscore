const fs = require('fs');
const path = require('path');
const profileQueries = require('../../server/queries/profileQueries');

const migration = fs.readFileSync(
  path.join(__dirname, '../../server/db/migrations/005_profile.sql'),
  'utf8'
);
const nightMode = fs.readFileSync(
  path.join(__dirname, '../../server/db/migrations/019_night_mode.sql'),
  'utf8'
);
const schema = fs.readFileSync(path.join(__dirname, '../../server/db/schema.sql'), 'utf8');

describe('profile sql', () => {
  test('stores dispatch and reminder flags on the account', () => {
    expect(schema).toContain("dispatch_mode VARCHAR(16) NOT NULL DEFAULT 'preview'");
    expect(schema).toContain('remind_daily BOOLEAN NOT NULL DEFAULT TRUE');
    expect(schema).toContain('alert_crown BOOLEAN NOT NULL DEFAULT TRUE');
    expect(schema).toContain('alert_new_member BOOLEAN NOT NULL DEFAULT FALSE');
    expect(schema).toContain('notifications BOOLEAN NOT NULL DEFAULT TRUE');
    expect(schema).toContain('night_mode BOOLEAN NOT NULL DEFAULT FALSE');
    expect(nightMode).toContain('ADD COLUMN IF NOT EXISTS night_mode BOOLEAN NOT NULL DEFAULT FALSE');
    expect(profileQueries.updateNightMode).toMatch(/night_mode = \$2/);
    expect(profileQueries.updateNightMode).toMatch(/WHERE user_id = \$1/);
    expect(schema).toContain("CHECK (dispatch_mode IN ('preview', 'auto'))");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS dispatch_mode');
    expect(migration).toContain('alert_new_member BOOLEAN NOT NULL DEFAULT FALSE');
  });

  test('stats, export, and delete stay on the caller', () => {
    expect(profileQueries.listStats).toMatch(/WHERE s\.user_id = \$1/);
    expect(profileQueries.listStats).toMatch(/GROUP BY/);
    expect(profileQueries.listStats).toMatch(/FILTER \(WHERE s\.solved\)/);
    expect(profileQueries.listStats).toMatch(/AVG\(s\.guesses\) FILTER \(WHERE s\.solved\)/);
    expect(profileQueries.listStats).toMatch(/sort_direction = 'lower' AND ga\.rank_basis = 'score' THEN MIN\(s\.score\)/);
    expect(profileQueries.listStats).toMatch(/FILTER \(WHERE NOT s\.solved\)/);
    expect(profileQueries.listExport).toMatch(/WHERE s\.user_id = \$1/);
    expect(profileQueries.deleteOwnScores).toMatch(/WHERE user_id = \$1/);
    expect(profileQueries.deleteMemberships).toMatch(/WHERE user_id = \$1/);
    expect(profileQueries.deleteUser).toMatch(/DELETE FROM users/);
  });
});
