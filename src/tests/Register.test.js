import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import toast from 'react-hot-toast';
import authReducer from '../store/auth.reducer';
import Register from '../routes/Register';
import { registerWithPassword } from '../helpers/authHelpers';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../helpers/authHelpers', () => ({
  registerWithPassword: jest.fn(),
  claimHandle: jest.fn(),
  googleLoginUrl: () => '/api/auth/google',
  appleLoginUrl: () => '/api/auth/apple',
  openSystemBrowserForOAuthStart: jest.fn(),
}));

jest.mock('../helpers/oauthConfig', () => ({
  fetchAuthConfig: jest.fn(),
}));

const { fetchAuthConfig } = require('../helpers/oauthConfig');

const renderRegister = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </Provider>
  );
};

const follows = (earlier, later) =>
  Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchAuthConfig.mockResolvedValue({ googleClientId: null, appleClientId: null });
  });

  test('collects display name, handle, email, and password', async () => {
    renderRegister();
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByTestId('auth-panel').className).not.toMatch(/rounded/);
    expect(screen.queryByText('The Daily Score')).not.toBeInTheDocument();
    expect(screen.queryByText('The Social Broadsheet of Daily Games')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  });

  test('places third-party sign-in under create account', async () => {
    fetchAuthConfig.mockResolvedValue({ googleClientId: 'google', appleClientId: 'apple' });
    renderRegister();
    const create = await screen.findByRole('button', { name: 'Create account' });
    const google = await screen.findByRole('link', { name: 'Continue with Google' });
    const apple = screen.getByRole('link', { name: 'Continue with Apple' });
    const already = screen.getByText(/Already registered/i);
    expect(follows(create, google)).toBe(true);
    expect(follows(apple, already)).toBe(true);
    expect(follows(google, already)).toBe(true);
  });

  test('shows the duplicate-handle error', async () => {
    const user = userEvent.setup();
    registerWithPassword.mockRejectedValue(new Error('Handle already in use'));
    renderRegister();

    await user.type(screen.getByLabelText('Display name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Handle'), 'ada_l');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Handle already in use');
    });
  });
});
