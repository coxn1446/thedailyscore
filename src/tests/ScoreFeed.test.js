import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import ScoreFeed from '../components/Home/ScoreFeed';
import rootReducer from '../store/rootReducer';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../utils/relativeTime', () => ({
  relativeTime: (value) => (value ? '5m ago' : ''),
}));

const post = {
  score_id: 3,
  puzzle_number: 74,
  snippet: '🐟',
  score: 355,
  guesses: null,
  solved: true,
  created_at: '2026-11-18T12:00:00.000Z',
  image_url: null,
  like_count: 1,
  liked: false,
  comment_count: 0,
  user: { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null },
  game: { slug: 'krillion', name: 'Krillion', rank_basis: 'score', guess_cap: null },
};

const renderFeed = (user = { user_id: 4, handle: 'ada' }) => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: { user, isAuthenticated: true, isLoading: false },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ScoreFeed />
      </MemoryRouter>
    </Provider>
  );
};

describe('ScoreFeed', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    toast.error.mockClear();
    const { Capacitor } = require('@capacitor/core');
    const { Browser } = require('@capacitor/browser');
    Capacitor.isNativePlatform.mockReturnValue(false);
    Capacitor.getPlatform.mockReturnValue('web');
    Browser.open.mockClear();
  });

  test('shows an empty feed', async () => {
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ posts: [] }) });
    renderFeed();
    expect(await screen.findByText('No scores yet.')).toBeInTheDocument();
  });

  test('likes a score and leaves a comment', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path === '/api/feed') return { ok: true, status: 200, json: async () => ({ posts: [post] }) };
      if (path.endsWith('/like') && options.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ liked: true, like_count: 2 }) };
      }
      if (path.endsWith('/comments') && options.method === 'POST') {
        return {
          ok: true,
          status: 201,
          json: async () => ({
            comment: { comment_id: 9, body: 'sharp', user: { user_id: 4, handle: 'ada', display_name: 'Ada' } },
          }),
        };
      }
      if (path.endsWith('/comments')) return { ok: true, status: 200, json: async () => ({ comments: [] }) };
      if (path.endsWith('/comments/9') && options.method === 'DELETE') {
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });

    renderFeed();
    expect(await screen.findByRole('link', { name: 'Bea' })).toHaveAttribute('href', '/profile/bea');
    expect(screen.getByText('355')).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Like 1' }));
    expect(await screen.findByRole('button', { name: 'Liked 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Comment 0' })).toHaveAttribute('href', '/post/3');
    expect(screen.getByRole('link', { name: /355/ })).toHaveAttribute('href', '/post/3');
  });

  test('updates a like before the server answers', async () => {
    const user = userEvent.setup();
    let release = () => {};
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    global.fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path === '/api/feed') return { ok: true, status: 200, json: async () => ({ posts: [post] }) };
      if (path.endsWith('/like') && options.method === 'POST') {
        await gate;
        return { ok: true, status: 200, json: async () => ({ liked: true, like_count: 4 }) };
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });

    renderFeed();
    await user.click(await screen.findByRole('button', { name: 'Like 1' }));
    expect(screen.getByRole('button', { name: 'Liked 2' })).toBeInTheDocument();
    release();
    expect(await screen.findByRole('button', { name: 'Liked 4' })).toBeInTheDocument();
  });

  test('restores a like when the server rejects it', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      const path = String(url);
      if (path === '/api/feed') return { ok: true, status: 200, json: async () => ({ posts: [post] }) };
      return { ok: false, status: 500, json: async () => ({ error: 'Could not like' }) };
    });

    renderFeed();
    await user.click(await screen.findByRole('button', { name: 'Like 1' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Like 1' })).toBeInTheDocument();
    });
    expect(toast.error).toHaveBeenCalledWith('Could not like');
  });

  test('opens a game link in the in-app browser on iOS', async () => {
    const { Capacitor } = require('@capacitor/core');
    const { Browser } = require('@capacitor/browser');
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue('ios');
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ posts: [post] }) });
    const user = userEvent.setup();
    renderFeed();
    const game = await screen.findByRole('link', { name: /Krillion/ });
    expect(game).toHaveAttribute('href', 'https://krillion.io');
    await user.click(game);
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://krillion.io/' });
  });

  test('reports a failed load', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({ error: 'Could not load the feed' }) });
    renderFeed();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the feed');
    expect(screen.queryByText('No scores yet.')).not.toBeInTheDocument();
  });
});
