import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import authReducer from '../store/auth.reducer';
import Login from '../routes/Login';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

jest.mock('../helpers/authHelpers', () => ({
  loginWithPassword: jest.fn(),
  googleLoginUrl: () => '/api/auth/google',
  appleLoginUrl: () => '/api/auth/apple',
  openSystemBrowserForOAuthStart: jest.fn(),
}));

jest.mock('../helpers/oauthConfig', () => ({
  fetchAuthConfig: jest.fn(),
}));

const { fetchAuthConfig } = require('../helpers/oauthConfig');

const follows = (earlier, later) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAuthConfig.mockResolvedValue({ googleClientId: 'google', appleClientId: 'apple' });
  });

  test('toasts for a forgotten password and places third-party sign-in after it', async () => {
    const user = userEvent.setup();
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      </Provider>
    );

    const forgot = await screen.findByRole('button', { name: 'Forgot password?' });
    const google = await screen.findByRole('link', { name: 'Continue with Google' });
    const account = screen.getByText(/No account/i);
    expect(screen.queryByRole('link', { name: 'Forgot password?' })).not.toBeInTheDocument();
    expect(follows(forgot, google)).toBe(true);
    expect(follows(google, account)).toBe(true);
    expect(follows(screen.getByRole('link', { name: 'Continue with Apple' }), account)).toBe(true);

    await user.click(forgot);
    expect(toast).toHaveBeenCalledWith('Reach Out to Will');
  });

  test('says the account was deleted when deletion opened sign-in', () => {
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={[{ pathname: '/login', state: { accountDeleted: true } }]}>
          <Login />
        </MemoryRouter>
      </Provider>
    );
    expect(screen.getByText('Account deleted.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
