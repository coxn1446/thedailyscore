const fs = require('fs');
const path = require('path');
const gameRequestQueries = require('../../server/queries/gameRequestQueries');
const userQueries = require('../../server/queries/userQueries');

const schema = fs.readFileSync(path.join(__dirname, '../../server/db/schema.sql'), 'utf8');
const migration = fs.readFileSync(
  path.join(__dirname, '../../server/db/migrations/023_admin.sql'),
  'utf8'
);

describe('admin sql', () => {
  test('stores an admin flag and whether a game request has been seen', () => {
    expect(schema).toContain('is_admin BOOLEAN NOT NULL DEFAULT FALSE');
    expect(schema).toContain('seen BOOLEAN NOT NULL DEFAULT FALSE');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE');
    expect(migration).toContain("WHERE handle = 'will'");
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS seen BOOLEAN NOT NULL DEFAULT FALSE');
    expect(userQueries.USER_FIELDS).toMatch(/is_admin/);
    expect(gameRequestQueries.countUnseen).toMatch(/seen = FALSE/);
    expect(gameRequestQueries.markSeen).toMatch(/SET seen = TRUE/);
    expect(gameRequestQueries.listRequests).toMatch(/JOIN users/);
  });
});