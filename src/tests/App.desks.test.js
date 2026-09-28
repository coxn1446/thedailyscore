import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../components/App';
import rootReducer from '../store/rootReducer';

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
    expect(within(tabs).getByRole('link', { name: 'Groups' })).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Messages' })).toBeInTheDocument();
    expect(within(tabs).getByRole('link', { name: 'Profile' })).toBeInTheDocument();
    expect(within(tabs).getByText('A')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Home' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Groups' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Profile' }).length).toBeGreaterThan(0);
    expect(await screen.findByTestId('desk-home')).toBeInTheDocument();
    expect(screen.queryByTestId('gazette')).not.toBeInTheDocument();
    expect(document.body.innerHTML).not.toMatch(/material-symbols|Material Symbols/i);
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
});
