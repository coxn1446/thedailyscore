import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import Profile from '../routes/Profile';
import rootReducer from '../store/rootReducer';
import { SCORE_POSTED } from '../helpers/scoreHelpers';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: jest.fn(async () => ({ receive: 'granted' })),
    requestPermissions: jest.fn(async () => ({ receive: 'granted' })),
    register: jest.fn(async () => {}),
    addListener: jest.fn(async () => ({ remove: jest.fn() })),
  },
}));

const renderProfile = () => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user: {
          user_id: 4,
          display_name: 'Will',
          handle: 'will',
          email: 'will@example.com',
          timezone: 'America/New_York',
        },
        isAuthenticated: true,
        isLoading: false,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    </Provider>
  );
};

describe('Profile bests', () => {
  beforeEach(() => {
    Capacitor.isNativePlatform.mockReturnValue(false);
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/profile')) {
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              timezone: 'America/New_York',
            },
            stats: [
              {
                slug: 'krillion',
                name: 'Krillion',
                rank_basis: 'score',
                played: 4,
                best_score: 230,
                average_score: 180,
              },
              {
                slug: 'wordle',
                name: 'Wordle',
                rank_basis: 'guesses',
                played: 3,
                best_guesses: 2,
                average_guesses: 3.5,
              },
              {
                slug: 'redactle',
                name: 'Redactle',
                rank_basis: 'guesses',
                guess_cap: null,
                played: 2,
                best_guesses: 35,
                average_guesses: 55.5,
                gave_up: 1,
                average_duration_seconds: 319,
                average_hints: 2,
              },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('shows one stats grid for each game', async () => {
    const user = userEvent.setup();
    renderProfile();
    expect(await screen.findByText('230')).toBeInTheDocument();
    expect(screen.getByText('2/6')).toBeInTheDocument();
    expect(screen.getByText('35')).toBeInTheDocument();
    expect(screen.getByText('55.5')).toBeInTheDocument();
    expect(screen.queryByText('5m19s · 2 hints · 1 give-up')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Score details' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('5m19s · 2 hints · 1 give-up');
    expect(screen.getByRole('button', { name: 'All time' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Best Score')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('Games Played')).toBeInTheDocument();
    expect(screen.queryByText('Day')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile desk')).not.toBeInTheDocument();
    expect(screen.getByText('Krillion')).toBeInTheDocument();
    expect(screen.queryByText(/points/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Unarchive' })).not.toBeInTheDocument();
  });

  test('reloads all-time marks after a score is posted', async () => {
    let profiles = 0;
    global.fetch = jest.fn(async (url) => {
      if (String(url).startsWith('/api/profile?')) {
        profiles += 1;
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              timezone: 'America/New_York',
            },
            stats: [{
              slug: 'krillion',
              name: 'Krillion',
              rank_basis: 'score',
              played: profiles,
              best_score: profiles === 1 ? 230 : 400,
              average_score: 180,
            }],
          }),
        };
      }
      return { ok: true, json: async () => ({ scores: [] }) };
    });

    renderProfile();
    expect(await screen.findByText('230')).toBeInTheDocument();
    window.dispatchEvent(new Event(SCORE_POSTED));
    expect(await screen.findByText('400')).toBeInTheDocument();
    expect(screen.queryByText('230')).not.toBeInTheDocument();
  });

  test('unarchives a group from the profile', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/scores/bests')) {
        return { ok: true, json: async () => ({ games: [] }) };
      }
      if (String(url).includes('/api/groups/archived')) {
        return {
          ok: true,
          json: async () => ({ groups: [{ group_id: 3, name: 'Closed desk', role: 'curator' }] }),
        };
      }
      if (String(url).includes('/unarchive') && options.method === 'POST') {
        return { ok: true, json: async () => ({ group: { group_id: 3, archived: false } }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    expect(await screen.findByText('Closed desk')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Unarchive' }));
    await waitFor(() => {
      expect(screen.queryByText('Closed desk')).not.toBeInTheDocument();
    });
    const call = global.fetch.mock.calls.find((entry) => String(entry[0]).includes('/unarchive'));
    expect(call[0]).toBe('/api/groups/3/unarchive');
    expect(call[1].method).toBe('POST');
  });

  test('saves a new handle and auto dispatch', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/profile') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: body.handle,
              email: 'will@example.com',
              timezone: 'America/New_York',
              dispatch_mode: body.dispatch_mode,
              remind_daily: true,
              alert_crown: true,
              alert_new_member: false,
            },
          }),
        };
      }
      if (String(url).includes('/api/profile')) {
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              timezone: 'America/New_York',
              dispatch_mode: 'preview',
              remind_daily: true,
              alert_crown: true,
              alert_new_member: false,
            },
            stats: [
              { slug: 'krillion', name: 'Krillion', rank_basis: 'score', played: 2, average_score: 300 },
              { slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', solved_count: 3, average_guesses: 4 },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    expect(await screen.findByText('Best Score')).toBeInTheDocument();
    expect(screen.getByText('Games Played')).toBeInTheDocument();
    expect(screen.queryByText('Profile desk')).not.toBeInTheDocument();
    expect(screen.queryByText('Scores stay inside shared groups.')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Timezone')).not.toBeInTheDocument();
    expect(screen.queryByText('Notices')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
    const handle = screen.getByLabelText('Handle');
    await user.clear(handle);
    await user.type(handle, 'william');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Saved');
    });
    const patch = global.fetch.mock.calls.find((entry) => entry[1]?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toMatchObject({ handle: 'william' });
    expect(JSON.parse(patch[1].body).dispatch_mode).toBeUndefined();
  });

  test('stores a portrait when a file is chosen', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/uploads') && options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({ media: { media_url: 'https://storage.googleapis.com/portraits/uploads/face.png' } }),
        };
      }
      if (String(url).includes('/api/profile') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              portrait_url: body.portrait_url,
            },
          }),
        };
      }
      if (String(url).includes('/api/profile')) {
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              portrait_url: null,
            },
            stats: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    const file = new File(['img'], 'face.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Choose file'), file);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Saved');
    });
    const upload = global.fetch.mock.calls.find((entry) => String(entry[0]).includes('/api/uploads'));
    expect(upload[1].method).toBe('POST');
    expect(upload[1].body).toBeInstanceOf(FormData);
    const patch = global.fetch.mock.calls.find((entry) => entry[1]?.method === 'PATCH');
    expect(JSON.parse(patch[1].body)).toMatchObject({
      portrait_url: 'https://storage.googleapis.com/portraits/uploads/face.png',
    });
    expect(document.querySelector('img[src="https://storage.googleapis.com/portraits/uploads/face.png"]')).toBeInTheDocument();
  });

  test('shows a bar while the portrait uploads', async () => {
    const user = userEvent.setup();
    let releaseUpload = () => {};
    const gate = new Promise((resolve) => {
      releaseUpload = resolve;
    });
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/uploads') && options.method === 'POST') {
        await gate;
        return {
          ok: true,
          status: 201,
          json: async () => ({ media: { media_url: 'https://storage.googleapis.com/portraits/uploads/face.png' } }),
        };
      }
      if (String(url).includes('/api/profile') && options.method === 'PATCH') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              portrait_url: body.portrait_url,
            },
          }),
        };
      }
      if (String(url).includes('/api/profile')) {
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
              portrait_url: null,
            },
            stats: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.upload(screen.getByLabelText('Choose file'), new File(['img'], 'face.png', { type: 'image/png' }));
    expect(await screen.findByRole('progressbar', { name: 'Uploading' })).toBeInTheDocument();
    releaseUpload();
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Saved');
    });
    expect(screen.queryByRole('progressbar', { name: 'Uploading' })).not.toBeInTheDocument();
  });

  test('leaves the portrait unchanged when the upload fails', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/uploads') && options.method === 'POST') {
        return { ok: false, status: 500, json: async () => ({ error: 'Could not upload portrait' }) };
      }
      if (String(url).includes('/api/profile')) {
        return {
          ok: true,
          json: async () => ({
            user: {
              user_id: 4,
              display_name: 'Will',
              handle: 'will',
              email: 'will@example.com',
            },
            stats: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.upload(screen.getByLabelText('Choose file'), new File(['img'], 'face.png', { type: 'image/png' }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not upload portrait');
    });
    expect(global.fetch.mock.calls.some((entry) => entry[1]?.method === 'PATCH')).toBe(false);
    expect(document.querySelector('img')).not.toBeInTheDocument();
  });

  test('asks before deleting the account', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('button', { name: 'Sign Out' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Delete Profile' }));
    expect(screen.getByRole('dialog', { name: 'Delete account' })).toHaveTextContent('permanent and cannot be reversed');
    expect(screen.getByText('The Daily Score')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Delete account' })).not.toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
  });

  test('lists a filed score in the game archive and can delete it', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (String(url).includes('/api/scores/archive')) {
        return {
          ok: true,
          json: async () => ({
            scores: [
              {
                score_id: 9,
                puzzle_number: 80,
                score: 210,
                guesses: null,
                solved: true,
                logged_at: '2026-09-27T15:00:00.000Z',
                game: { slug: 'krillion', name: 'Krillion', rank_basis: 'score' },
                groups: [{ group_id: 4, name: 'Monday desk' }],
                options: [{ group_id: 4, name: 'Monday desk' }],
              },
            ],
          }),
        };
      }
      if (String(url) === '/api/scores/9/groups' && options.method === 'PATCH') {
        return { ok: true, json: async () => ({ score_id: 9, groups: [] }) };
      }
      if (String(url) === '/api/scores/9' && options.method === 'DELETE') {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Game Archive' }));
    expect(await screen.findByText('Krillion')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Monday desk' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.queryByText('210')).not.toBeInTheDocument();
    });
  });

  test('keeps notification toggles off the profile', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    expect(screen.queryByRole('button', { name: 'Daily reminder' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Crown' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New member' })).not.toBeInTheDocument();
  });

  test('exports the caller csv', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/profile/export')) {
        return { ok: true, blob: async () => new Blob(['game\n']) };
      }
      if (String(url).includes('/api/profile')) {
        return { ok: true, json: async () => ({ user: null, stats: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    global.URL.createObjectURL = jest.fn(() => 'blob:scores');
    global.URL.revokeObjectURL = jest.fn();

    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => {
      expect(global.fetch.mock.calls.some((entry) => String(entry[0]) === '/api/profile/export')).toBe(true);
    });
  });

  test('turns account notifications on from Settings', async () => {
    const user = userEvent.setup();
    Capacitor.isNativePlatform.mockReturnValue(true);
    PushNotifications.checkPermissions.mockResolvedValue({ receive: 'prompt' });
    PushNotifications.requestPermissions.mockResolvedValue({ receive: 'granted' });
    PushNotifications.register.mockResolvedValue();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (options.method === 'PATCH') {
        return { ok: true, json: async () => ({ user: { user_id: 4, notifications: true } }) };
      }
      return {
        ok: true,
        json: async () => ({
          user: { user_id: 4, display_name: 'Will', handle: 'will', notifications: false },
          stats: [],
        }),
      };
    });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const toggle = await screen.findByRole('switch', { name: 'Notifications' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    await user.click(toggle);
    await waitFor(() => {
      expect(PushNotifications.requestPermissions).toHaveBeenCalled();
      const patch = global.fetch.mock.calls.find((entry) => entry[1]?.method === 'PATCH');
      expect(JSON.parse(patch[1].body)).toEqual({ notifications: true });
    });
    Capacitor.isNativePlatform.mockReturnValue(false);
  });

  test('saves night mode from Settings', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (options.method === 'PATCH') {
        return {
          ok: true,
          json: async () => ({
            user: { user_id: 4, display_name: 'Will', handle: 'will', night_mode: true },
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          user: { user_id: 4, display_name: 'Will', handle: 'will', night_mode: false },
          stats: [],
        }),
      };
    });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const toggle = await screen.findByRole('switch', { name: 'Night mode' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    await user.click(toggle);
    await waitFor(() => {
      const patch = global.fetch.mock.calls.find((entry) => entry[1]?.method === 'PATCH');
      expect(JSON.parse(patch[1].body)).toEqual({ night_mode: true });
      expect(toggle).toHaveAttribute('aria-checked', 'true');
    });
  });

  test('leaves night mode off when the save fails', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async (url, options = {}) => {
      if (options.method === 'PATCH') {
        return { ok: false, status: 400, json: async () => ({ error: 'Could not save' }) };
      }
      return {
        ok: true,
        json: async () => ({
          user: { user_id: 4, display_name: 'Will', handle: 'will', night_mode: false },
          stats: [],
        }),
      };
    });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    const toggle = await screen.findByRole('switch', { name: 'Night mode' });
    await user.click(toggle);
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not save');
      expect(toggle).toHaveAttribute('aria-checked', 'false');
    });
  });

  test('keeps a guest profile on this device', async () => {
    const user = userEvent.setup();
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Profile />
        </MemoryRouter>
      </Provider>
    );
    expect(await screen.findByRole('heading', { name: 'Guest' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Profile' }));
    expect(screen.getByRole('link', { name: 'Log In' })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: 'Create account' })).toHaveAttribute('href', '/register');
    expect(screen.queryByRole('button', { name: 'Sign Out' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('switch', { name: 'Notifications' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Night mode' }));
    expect(screen.getByRole('switch', { name: 'Night mode' })).toHaveAttribute('aria-checked', 'true');
    expect(global.fetch.mock.calls.some((call) => call[1]?.method === 'PATCH')).toBe(false);
  });

  test('sends a guest to log in before adding a friend', async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        user: { user_id: 8, handle: 'bea', display_name: 'Bea' },
        stats: [],
        relation: { status: 'none' },
      }),
    }));
    const Where = () => {
      const location = useLocation();
      return <div data-testid="where">{`${location.pathname}${location.search}`}</div>;
    };
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/profile/bea']}>
          <Where />
          <Routes>
            <Route path="/profile/:handle" element={<Profile />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    await user.click(await screen.findByRole('button', { name: 'Add Friend' }));
    expect(screen.getByTestId('where').textContent).toContain('/login?next=');
    expect(global.fetch.mock.calls.some((call) => String(call[0]).includes('/api/friends'))).toBe(false);
  });
});
