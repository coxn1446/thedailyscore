const fs = require('fs');
const path = require('path');
const { needsPolicyAcceptance, postAuthPath } = require('../../server/utils/policyVersions');

describe('policy acceptance gate', () => {
  test('clears stored versions in the migration', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, '../../server/db/migrations/024_clear_policy_acceptance.sql'),
      'utf8'
    );
    expect(sql).toMatch(/UPDATE users/);
    expect(sql).toMatch(/tos_accepted_version = NULL/);
    expect(sql).toMatch(/privacy_accepted_version = NULL/);
  });

  test('sends a reader who has not accepted the current policies to the agreement page', () => {
    const reader = {
      handle: 'ada',
      needs_handle: false,
      needs_tos_acceptance: true,
      needs_privacy_acceptance: true,
    };
    expect(needsPolicyAcceptance(reader)).toBe(true);
    expect(postAuthPath(reader)).toBe('/');
    expect(postAuthPath({ handle: 'ada', needs_handle: false })).toBe('/');
    expect(postAuthPath({ handle: null, needs_handle: true, needs_tos_acceptance: true })).toBe('/register');
  });
});
