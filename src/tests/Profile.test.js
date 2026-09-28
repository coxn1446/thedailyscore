import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import Profile from '../routes/Profile';
import rootReducer from '../store/rootReducer';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
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
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
  });

  test('shows one stats grid for each game', async () => {
    renderProfile();
    expect(await screen.findByText('230')).toBeInTheDocument();
    expect(screen.getByText('2/6')).toBeInTheDocument();
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

  test('asks before deleting the account', async () => {
    const user = userEvent.setup();
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Profile' }));
    await user.click(screen.getByRole('button', { name: 'Delete Profile' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('permanent and cannot be reversed');
    expect(screen.getByText('The Daily Score')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
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
    await user.click(screen.getByRole('checkbox', { name: 'Monday desk' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      const patch = global.fetch.mock.calls.find((entry) => entry[1]?.method === 'PATCH');
      expect(JSON.parse(patch[1].body).groups).toEqual([]);
    });
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
    await user.click(screen.getByRole('button', { name: 'Export CSV' }));
    await waitFor(() => {
      expect(global.fetch.mock.calls.some((entry) => String(entry[0]) === '/api/profile/export')).toBe(true);
    });
  });
});
