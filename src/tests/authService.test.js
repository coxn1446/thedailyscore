jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(),
  query: jest.fn(),
}));

jest.mock('../../server/helpers/email', () => ({
  sendEmail: jest.fn().mockResolvedValue({ skipped: true }),
  isEmailConfigured: jest.fn().mockReturnValue(false),
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn(),
  })),
}));

const bcrypt = require('bcrypt');
const { isDbHealthy, query } = require('../../server/db');
const { userQueries } = require('../../server/queries');
const authService = require('../../server/services/authService');
const { CURRENT_PRIVACY_VERSION, CURRENT_TOS_VERSION } = require('../../server/utils/policyVersions');

const registration = {
  displayName: 'Ada Lovelace',
  handle: 'Ada_L',
  email: 'Ada@Example.com',
  password: 'secret',
  timezone: 'America/New_York',
  acceptedPolicies: true,
};

describe('authService accounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
    bcrypt.hash.mockResolvedValue('hashed');
  });

  test('registers a lowercase handle, display name, email, and client timezone', async () => {
    query.mockResolvedValue({
      rows: [
        {
          user_id: 1,
          email: 'ada@example.com',
          handle: 'ada_l',
          display_name: 'Ada Lovelace',
          timezone: 'America/New_York',
          password: 'hashed',
          tos_accepted_version: CURRENT_TOS_VERSION,
          privacy_accepted_version: CURRENT_PRIVACY_VERSION,
        },
      ],
    });

    const user = await authService.registerLocalUser(registration);

    expect(query).toHaveBeenCalledWith(userQueries.insertLocalUser, [
      'ada@example.com',
      'ada_l',
      'hashed',
      'Ada Lovelace',
      'America/New_York',
      CURRENT_TOS_VERSION,
      CURRENT_PRIVACY_VERSION,
    ]);
    expect(user.handle).toBe('ada_l');
    expect(user.needs_handle).toBe(false);
    expect(user.password).toBeUndefined();
  });

  test('rejects a duplicate handle', async () => {
    const err = new Error('duplicate');
    err.code = '23505';
    err.constraint = 'users_handle_key';
    query.mockRejectedValue(err);

    await expect(authService.registerLocalUser(registration)).rejects.toMatchObject({
      status: 409,
      message: 'Handle already in use',
    });
  });

  test('rejects a handle that is too short', async () => {
    await expect(
      authService.registerLocalUser({ ...registration, handle: 'ab' })
    ).rejects.toMatchObject({ status: 400 });
    expect(query).not.toHaveBeenCalled();
  });

  test('creates a Google account without a handle', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: 4,
            email: 'ada@example.com',
            handle: null,
            display_name: 'Ada Lovelace',
            google_id: 'google-1',
            email_verified: true,
          },
        ],
      });

    const user = await authService.findOrCreateOAuthUser('google', {
      id: 'google-1',
      emails: [{ value: 'ada@example.com' }],
      displayName: 'Ada Lovelace',
    });

    expect(query).toHaveBeenCalledWith(userQueries.insertOAuthUser, [
      'ada@example.com',
      'google-1',
      null,
      'Ada Lovelace',
    ]);
    expect(user.needs_handle).toBe(true);
  });

  test('claiming a taken handle is rejected', async () => {
    query.mockResolvedValueOnce({
      rows: [{ user_id: 4, handle: null, email: 'ada@example.com' }],
    });
    const err = new Error('duplicate');
    err.code = '23505';
    err.constraint = 'users_handle_key';
    query.mockRejectedValueOnce(err);

    await expect(
      authService.claimHandle(4, {
        handle: 'ada_l',
        timezone: 'UTC',
        displayName: 'Ada Lovelace',
        acceptedPolicies: true,
      })
    ).rejects.toMatchObject({
      status: 409,
      message: 'Handle already in use',
    });
  });
});
