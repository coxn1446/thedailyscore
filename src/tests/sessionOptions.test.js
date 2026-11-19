const { buildSessionOptions, THIRTY_DAYS_MS } = require('../../server/utils/sessionOptions');

describe('session options', () => {
  test('rolls a secure cookie forward on the live site', () => {
    const options = buildSessionOptions({
      secret: 'test-secret',
      defaultClientUrl: 'https://thedailyscore.site',
    });

    expect(options.rolling).toBe(true);
    expect(options.resave).toBe(false);
    expect(options.saveUninitialized).toBe(false);
    expect(options.cookie.httpOnly).toBe(true);
    expect(options.cookie.maxAge).toBe(THIRTY_DAYS_MS);
    expect(options.cookie.sameSite).toBe('none');
    expect(options.cookie.secure).toBe(true);
  });

  test('keeps a lax cookie for local http', () => {
    const options = buildSessionOptions({ defaultClientUrl: 'http://localhost:3000' });
    expect(options.rolling).toBe(true);
    expect(options.cookie.sameSite).toBe('lax');
    expect(options.cookie.secure).toBe(false);
  });
});
