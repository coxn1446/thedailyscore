import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import Home from '../routes/Home';
import rootReducer from '../store/rootReducer';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const krillionPaste = 'Krillion #74 🦐\n355';

const previewPayload = {
  game: {
    game_id: 2,
    slug: 'krillion',
    name: 'Krillion',
    rank_basis: 'score',
    board: 'daily',
    sort_direction: 'higher',
  },
  puzzle_number: 74,
  score: 355,
  guesses: null,
  solved: true,
  snippet: '🐟🫧🏮',
  groups: [
    { group_id: 11, name: 'Monday desk' },
    { group_id: 10, name: 'Sunday desk' },
  ],
};

const postedPayload = {
  ...previewPayload,
  groups: [
    { group_id: 11, name: 'Monday desk', rank: 2 },
    { group_id: 10, name: 'Sunday desk', rank: 1 },
  ],
};

const renderHome = (user = null) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: {
        user,
        isAuthenticated: Boolean(user),
        isLoading: false,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </Provider>
  );
};

describe('Home paste desk', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('starts empty, previews, posts, and edits back', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/scores/preview')) {
        return { ok: true, json: async () => previewPayload };
      }
      return { ok: true, json: async () => postedPayload };
    });

    renderHome();
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toHaveAttribute(
      'placeholder',
      'copy and paste your score from any daily game here.'
    );
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveClass('w-full');
    expect(screen.queryByText(/Log today's result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/We'll take care of the rest/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('Result'));
    await user.paste(krillionPaste);
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText('Krillion')).toBeInTheDocument();
    expect(screen.getByText('#74')).toBeInTheDocument();
    expect(screen.getByText('355')).toBeInTheDocument();
    expect(screen.getByText('🐟🫧🏮')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Monday desk' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Sunday desk' })).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Saved');
    });
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toHaveValue('');

    await user.click(screen.getByLabelText('Result'));
    await user.paste(krillionPaste);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Result')).toHaveValue(krillionPaste);
  });

  test('shows an error for an unrecognized paste and does not post', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/preview')) {
        return { ok: false, status: 400, json: async () => ({ error: 'Unrecognized result' }) };
      }
      return { ok: true, json: async () => postedPayload };
    });

    renderHome();
    await user.type(screen.getByLabelText('Result'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Game not recognized.');
    expect(screen.getByRole('link', { name: 'Submit a request?' })).toHaveAttribute('href', '/request-game');
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch.mock.calls.some((call) => String(call[0]).includes('/preview'))).toBe(true);
    });
    expect(global.fetch.mock.calls.some((call) => String(call[0]) === '/api/scores')).toBe(false);
  });

  test('posts a personal score when there is no group', async () => {
    const user = userEvent.setup();
    const alone = {
      ...previewPayload,
      groups: [],
    };
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/preview')) return { ok: true, json: async () => alone };
      return { ok: true, json: async () => ({ ...alone, groups: [] }) };
    });

    renderHome();
    await user.type(screen.getByLabelText('Result'), 'Krillion #74');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('button', { name: 'Post' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Result')).toHaveValue('');
    });
    const post = global.fetch.mock.calls.find((call) => String(call[0]) === '/api/scores');
    expect(JSON.parse(post[1].body).groups).toEqual([]);
  });

  test('toggles every group and posts only the ones left on', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/preview')) return { ok: true, json: async () => previewPayload };
      return { ok: true, json: async () => ({ ...postedPayload, groups: [] }) };
    });

    renderHome();
    await user.type(screen.getByLabelText('Result'), 'Krillion');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('checkbox', { name: 'Sunday desk' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Deselect All' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Deselect All' }));
    expect(screen.getByRole('checkbox', { name: 'Sunday desk' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Monday desk' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Sunday desk' }));
    await user.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      const post = global.fetch.mock.calls.find((call) => String(call[0]) === '/api/scores');
      expect(JSON.parse(post[1].body).groups).toEqual([10]);
    });
  });

  test('shows the paste form without the gazette', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.queryByTestId('gazette')).not.toBeInTheDocument();
    expect(screen.queryByText('Today on The Daily Score')).not.toBeInTheDocument();
  });
});
