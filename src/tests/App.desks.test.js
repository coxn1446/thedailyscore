import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../components/App';
import { resetSessionClientForTests, sessionDocument } from '../helpers/sessionClient';
import rootReducer from '../store/rootReducer';
import { AUTH_USER_KEY, cacheGet, cacheSet } from '../utils/sessionCache';

const signedInUser = {
  user_id: 7,
  display_name: 'Ada Lovelace',
  handle: 'ada_l',
  email: 'ada@example.com',
  timezone: 'America/New_York',
  needs_handle: false,
};

function renderApp(path = '/') {
  const store = configureStore({ reducer: rootReducer });
  const view = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </Provider>
  );
  return { store, ...view };
}

describe('App desks and sign-in', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/config')) {
        return { ok: true, json: async () => ({ googleClientId: null, appleClientId: null }) };
      }
      return { ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) };
    });
  });

  test('sends a guest from / to sign-in', async () => {
    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('masthead')).not.toBeInTheDocument();
  });

  test('asks the server before opening the desk for a saved reader', async () => {
    cacheSet(AUTH_USER_KEY, signedInUser);
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, status: 200, json: async () => ({ user: signedInUser }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    renderApp('/');
    expect(await screen.findByTestId('desk-home')).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/auth/me',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    );
  });

  test('reloads once for a saved reader with no session, then sends them to sign-in', async () => {
    cacheSet(AUTH_USER_KEY, signedInUser);
    const reload = jest.spyOn(sessionDocument, 'reload').mockImplementation(() => {});

    const first = renderApp('/');
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('desk-home')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(cacheGet(AUTH_USER_KEY)).toEqual(signedInUser);

    first.unmount();
    resetSessionClientForTests();
    reload.mockClear();
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByTestId('desk-home')).not.toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(cacheGet(AUTH_USER_KEY)).toBeUndefined();
    reload.mockRestore();
  });

  test('shows the masthead and three desks for a signed-in reader', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ user: signedInUser }) };
      }
      if (String(url).includes('/api/scores/logged-today')) {
        return { ok: true, json: async () => ({ count: 2 }) };
      }
      if (String(url).includes('/api/scores/gazette')) {
        return { ok: true, json: async () => ({ cards: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/');
    expect(await screen.findByTestId('masthead')).toBeInTheDocument();
    expect(screen.queryByText('The Social Broadsheet of Daily Games')).not.toBeInTheDocument();
    expect(screen.getByText('YOUR DAILY GAMES. ONE SCORE.')).toBeInTheDocument();
    expect(screen.queryByText(/Latest sync/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('colophon')).not.toBeInTheDocument();
    const tabs = screen.getByTestId('mobile-tab-bar');
    expect(within(tabs).getByRole('link', { name: 'Home' })).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Board' })).toBeInTheDocument();
    expect(within(tabs).queryByRole('link', { name: 'Groups' })).not.toBeInTheDocument();
    expect(within(tabs).queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(within(tabs).queryByRole('link', { name: /Admin/ })).not.toBeInTheDocument();
    expect(within(tabs).getByText('A')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Board' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0);
    expect(await screen.findByTestId('desk-home')).toBeInTheDocument();
    expect(screen.queryByTestId('gazette')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/material-symbols|Material Symbols/i);
  });

  test('asks a signed-in reader to accept the current policies before chrome', async () => {
    const user = userEvent.setup();
    const agreed = { ...signedInUser, needs_tos_acceptance: false, needs_privacy_acceptance: false };
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/auth/me')) {
        return {
          ok: true,
          json: async () => ({
            user: { ...signedInUser, needs_tos_acceptance: true, needs_privacy_acceptance: true },
          }),
        };
      }
      if (String(url).includes('/api/auth/policies') && options.method === 'POST') {
        return { ok: true, json: async () => ({ user: agreed }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/');
    const dialog = await screen.findByRole('dialog', { name: 'Terms and Privacy' });
    expect(dialog).toHaveClass('max-w-sm');
    expect(dialog.parentElement).toHaveClass('items-center', 'justify-center');
    expect(screen.getByText(/changed on November 16, 2026/)).toBeInTheDocument();
    expect(screen.getByTestId('masthead')).toBeInTheDocument();
    expect(screen.getByTestId('desk-home')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Terms and Privacy' })).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('desk-home')).toBeInTheDocument();
  });

  test('keeps a Google account on the handle desk before chrome', async () => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return {
          ok: true,
          json: async () => ({
            user: { ...signedInUser, handle: null, needs_handle: true },
          }),
        };
      }
      if (String(url).includes('/api/auth/config')) {
        return { ok: true, json: async () => ({ googleClientId: null, appleClientId: null }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/');
    expect(await screen.findByRole('heading', { name: 'Choose a handle' })).toBeInTheDocument();
    expect(screen.getByLabelText('Handle')).toBeInTheDocument();
    expect(screen.queryByTestId('masthead')).not.toBeInTheDocument();
  });

  test('shows Admin and an unseen badge only for an admin', async () => {
    const admin = { ...signedInUser, is_admin: true };
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ user: admin }) };
      }
      if (String(url).includes('/api/admin/requests/unseen')) {
        return { ok: true, json: async () => ({ count: 2 }) };
      }
      if (String(url).includes('/api/friends')) {
        return { ok: true, json: async () => ({ incoming: [], outgoing: [], friends: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/');
    const tabs = await screen.findByTestId('mobile-tab-bar');
    expect(await within(tabs).findByRole('link', { name: /Admin/ })).toBeInTheDocument();
    expect(within(tabs).getByText('2')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Admin/ }).length).toBeGreaterThan(1);
  });

  test('restores night mode from the account and clears it on sign-out', async () => {
    const user = userEvent.setup();
    const nightUser = { ...signedInUser, night_mode: true };
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ user: nightUser }) };
      }
      if (String(url).includes('/api/profile')) {
        return { ok: true, json: async () => ({ user: nightUser, stats: [] }) };
      }
      if (String(url).includes('/api/auth/logout') && options.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/profile');
    expect(await screen.findByTestId('desk-profile')).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement).toHaveClass('night'));
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
      expect(document.documentElement).not.toHaveClass('night');
    });
  });

  test('signs out from the profile desk', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, json: async () => ({ user: signedInUser }) };
      }
      if (String(url).includes('/api/auth/logout') && options.method === 'POST') {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderApp('/profile');
    expect(await screen.findByTestId('desk-profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Sign Out' }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });
  });

  test('confirming delete profile opens sign-in with account deleted', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, status: 200, json: async () => ({ user: signedInUser }) };
      }
      if (options.method === 'DELETE') {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      if (String(url).includes('/api/profile')) {
        return { ok: true, status: 200, json: async () => ({ user: signedInUser, stats: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    });

    renderApp('/profile');
    expect(await screen.findByTestId('desk-profile')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Delete Profile' }));
    await user.click(screen.getByRole('button', { name: 'Delete account' }));

    expect(await screen.findByText('Account deleted.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Handle')).not.toBeInTheDocument();
  });
});
