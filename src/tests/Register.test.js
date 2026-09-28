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
}));

jest.mock('../helpers/oauthConfig', () => ({
  fetchAuthConfig: jest.fn().mockResolvedValue({ googleClientId: null, appleClientId: null }),
}));

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

describe('Register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('collects display name, handle, email, and password', async () => {
    renderRegister();
    expect(await screen.findByLabelText('Display name')).toBeInTheDocument();
    expect(screen.getByLabelText('Handle')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByTestId('auth-panel').className).not.toMatch(/rounded/);
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
