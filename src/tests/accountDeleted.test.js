import { markAccountDeleted, signedOutLoginTarget } from '../helpers/accountDeleted';

describe('account deletion sign-in', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('sends a signed-out reader back to the page they wanted', () => {
    expect(signedOutLoginTarget('/profile', '')).toEqual({
      to: '/login?next=%2Fprofile',
      state: null,
    });
  });

  test('does not send a deleted account back to profile', () => {
    markAccountDeleted();
    expect(signedOutLoginTarget('/profile', '')).toEqual({
      to: '/login',
      state: { accountDeleted: true },
    });
  });
});