import { getAuthInitialState } from '../store/auth.reducer';
import { AUTH_USER_KEY, cacheSet } from '../utils/sessionCache';

describe('auth reducer', () => {
  test('keeps the desk closed until the session is read', () => {
    cacheSet(AUTH_USER_KEY, { user_id: 1, handle: 'ada' });
    expect(getAuthInitialState()).toEqual({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    });
  });
});
