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
const reader = { user_id: 4, handle: 'ada', needs_handle: false };

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

const gameHrefs = (nav) => [...nav.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]);

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
    const { Capacitor } = require('@capacitor/core');
    Capacitor.isNativePlatform.mockReturnValue(false);
    Capacitor.getPlatform.mockReturnValue('web');
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

    renderHome(reader);
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toHaveAttribute(
      'placeholder',
      'copy and paste your score from any daily game here.'
    );
    expect(screen.queryByText(/Log today's result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/We'll take care of the rest/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();

    await user.click(screen.getByLabelText('Result'));
    await user.paste(krillionPaste);
    await user.keyboard('{Control>}{Enter}{/Control}');

    expect(await screen.findByText('#74')).toBeInTheDocument();
    expect(screen.getAllByText('Krillion')).toHaveLength(1);
    expect(screen.getByText('#74')).toBeInTheDocument();
    expect(screen.getByText('355')).toBeInTheDocument();
    expect(screen.getByText('🐟🫧🏮')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    const postButton = screen.getByRole('button', { name: 'Post' });
    expect(postButton.className).toContain('ml-auto');
    expect(postButton.closest('div')?.querySelector('button')).toHaveTextContent('Edit');
    await user.click(postButton);
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Saved');
    });
    expect(screen.queryByRole('button', { name: 'Paste another' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Result')).toHaveValue('');
    const post = global.fetch.mock.calls.find((call) => String(call[0]) === '/api/scores' && call[1]?.method === 'POST');
    expect(JSON.parse(post[1].body).groups).toEqual([]);

    await user.click(screen.getByLabelText('Result'));
    await user.paste(krillionPaste);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByLabelText('Result')).toHaveValue(krillionPaste);
  });

  test('toasts a week best ahead of a plain save', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/scores/preview')) {
        return { ok: true, json: async () => previewPayload };
      }
      return { ok: true, json: async () => ({ ...postedPayload, personal: { best_week: true, best_all: false } }) };
    });

    renderHome(reader);
    await user.click(screen.getByLabelText('Result'));
    await user.paste(krillionPaste);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(await screen.findByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Best this week.');
    });
  });

  test('renews the session and shows the preview', async () => {
    const user = userEvent.setup();
    let previews = 0;
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/auth/me')) {
        return { ok: true, status: 200, json: async () => ({ user: { user_id: 4, handle: 'ada' } }) };
      }
      if (String(url).includes('/preview')) {
        previews += 1;
        if (previews === 1) {
          return { ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) };
        }
        return { ok: true, status: 200, json: async () => previewPayload };
      }
      return { ok: true, status: 200, json: async () => ({ scores: [] }) };
    });

    renderHome({ user_id: 4, handle: 'ada', needs_handle: false });
    await user.type(screen.getByLabelText('Result'), 'Krillion');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('355')).toBeInTheDocument();
    expect(screen.queryByText('Not authenticated')).not.toBeInTheDocument();
    expect(previews).toBe(2);
  });

  test('restores a paste left in this tab', () => {
    sessionStorage.setItem('ds:pending-paste', krillionPaste);
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ scores: [] }) });
    renderHome({ user_id: 4, handle: 'ada' });
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
    expect(screen.getByRole('link', { name: 'Submit a request for a new game?' })).toHaveAttribute('href', '/login?next=/request-game');
    expect(screen.getByRole('link', { name: 'Report a bug' })).toHaveAttribute('href', '/login?next=/');
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

    renderHome(reader);
    await user.type(screen.getByLabelText('Result'), 'Krillion #74');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByRole('button', { name: 'Post' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(screen.getByLabelText('Result')).toHaveValue('');
    });
    expect(screen.queryByRole('button', { name: 'Paste another' })).not.toBeInTheDocument();
    const post = global.fetch.mock.calls.find((call) => String(call[0]) === '/api/scores' && call[1]?.method === 'POST');
    expect(JSON.parse(post[1].body).groups).toEqual([]);
  });

  test('shows today’s global rank on the posted score', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/preview')) return { ok: true, json: async () => previewPayload };
      if (String(url).includes('/api/scores/recap')) {
        return { ok: true, json: async () => ({ period: 'today', on: '2026-11-16', games: [{ slug: 'krillion', name: 'Krillion', line: '355', rank: 1 }] }) };
      }
      return { ok: true, json: async () => ({ ...postedPayload, global_rank: 1 }) };
    });

    renderHome(reader);
    await user.type(screen.getByLabelText('Result'), 'Krillion');
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.queryByRole('button', { name: 'Select All' })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Rank 1');
    });
    expect(screen.getByLabelText('Result')).toHaveValue('');
    expect(screen.queryByText('Rank 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Share to Instagram' })).not.toBeInTheDocument();
  });

  test('opens the Instagram story modal beside copy on iOS', async () => {
    const { Capacitor } = require('@capacitor/core');
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue('ios');
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/scores/recap')) {
        return { ok: true, json: async () => ({ period: 'today', on: '2026-11-16', games: [{ slug: 'krillion', name: 'Krillion', line: '355', rank: 1 }] }) };
      }
      return { ok: true, json: async () => ({ scores: [] }) };
    });
    renderHome();
    const share = screen.getByRole('button', { name: 'Share to Instagram' });
    expect(share).not.toHaveTextContent('Share to');
    expect(share.querySelector('img')).toBeTruthy();
    await user.click(share);
    const dialog = await screen.findByRole('dialog', { name: 'Share to Instagram' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Paper' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toBeInTheDocument();
    expect(screen.getByText('thedailyscore.site')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Share to Instagram' })).not.toBeInTheDocument();
  });

  test('shows the paste form and opens games from the action button', async () => {
    const user = userEvent.setup();
    renderHome();
    expect(screen.getByRole('heading', { name: 'What did you play today?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: "Copy Today's Score" })).not.toHaveTextContent("Copy Today's Score");
    expect(screen.queryByRole('button', { name: 'Share to Instagram' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('gazette')).not.toBeInTheDocument();
    expect(screen.queryByText('Today on The Daily Score')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Games' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Games' }));
    const games = await screen.findByRole('navigation', { name: 'Games' });
    expect(document.body.contains(games)).toBe(true);
    expect(screen.getByTestId('desk-home').contains(games)).toBe(false);
    await waitFor(() => {
      expect(gameHrefs(games)).toEqual([
        ['Map Tap', 'https://maptap.gg'],
        ['Krillion', 'https://krillion.io'],
        ['Size it Up', 'https://magnitudle.com/size-it-up'],
        ['Wordle', 'https://www.nytimes.com/games/wordle/index.html'],
        ['Redactle', 'https://redactle.net'],
        ['Time Guesser', 'https://timeguessr.com'],
        ['Semantle', 'https://semantle.com'],
        ['Farflung', 'https://farflung.game'],
        ['Eraly', 'https://eraly.io'],
        ['Fermi', 'https://fermi.gg'],
        ['Hivemind', 'https://playpindrop.app/hivemind'],
        ['Noillirk', 'https://noillirkgame.com/'],
      ]);
    });
  });

  test('opens a game from the menu in the in-app browser on iOS', async () => {
    const { Capacitor } = require('@capacitor/core');
    const { Browser } = require('@capacitor/browser');
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue('ios');
    Browser.open.mockClear();
    global.fetch.mockResolvedValue({ ok: true, status: 200, json: async () => ({ scores: [] }) });
    const user = userEvent.setup();
    renderHome({ user_id: 4, handle: 'ada' });
    await user.click(screen.getByRole('button', { name: 'Games' }));
    await user.click(await screen.findByRole('link', { name: 'Krillion' }));
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://krillion.io/' });
  });

  test('keeps a deselected game off Home until the saved list arrives', async () => {
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/api/profile/games')) return pending;
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ scores: [] }) });
    });

    const user = userEvent.setup();
    renderHome({ user_id: 4, handle: 'ada' });
    expect(screen.queryByRole('link', { name: 'Wordle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Krillion' })).not.toBeInTheDocument();

    release({
      ok: true,
      status: 200,
      json: async () => ({
        games: [
          { slug: 'map-tap', enabled: true },
          { slug: 'krillion', enabled: true },
          { slug: 'size-it-up', enabled: true },
          { slug: 'wordle', enabled: false },
          { slug: 'redactle', enabled: true },
          { slug: 'time-guesser', enabled: true },
          { slug: 'semantle', enabled: true },
        ],
      }),
    });

    await user.click(screen.getByRole('button', { name: 'Games' }));
    expect(await screen.findByRole('link', { name: 'Krillion' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Wordle' })).not.toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem('ds:home-games'))).not.toContain('wordle');
  });

  test('draws the saved list immediately on the next visit', async () => {
    sessionStorage.setItem('ds:home-games', JSON.stringify(['krillion']));
    let release;
    const pending = new Promise((resolve) => {
      release = resolve;
    });
    global.fetch.mockImplementation((url) => {
      if (String(url).includes('/api/profile/games')) return pending;
      return Promise.resolve({ ok: true, status: 200, json: async () => ({ scores: [] }) });
    });

    const user = userEvent.setup();
    renderHome({ user_id: 4, handle: 'ada' });
    await user.click(screen.getByRole('button', { name: 'Games' }));
    expect(screen.getByRole('link', { name: 'Krillion' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Wordle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Map Tap' })).not.toBeInTheDocument();

    release({
      ok: true,
      status: 200,
      json: async () => ({
        games: [
          { slug: 'krillion', enabled: true },
          { slug: 'wordle', enabled: false },
        ],
      }),
    });
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Krillion' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('link', { name: 'Wordle' })).not.toBeInTheDocument();
  });

  test('copies today’s filed scores when the clipboard API is missing', async () => {
    const user = userEvent.setup();
    let copied = '';
    document.execCommand = jest.fn(() => {
      const area = document.querySelector('textarea[aria-hidden="true"]');
      copied = area ? area.value : copied;
      return true;
    });
    delete navigator.clipboard;
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        on: '2026-09-30',
        scores: [{ slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', guesses: 3, solved: true, score: null }],
      }),
    });

    const view = renderHome(reader);
    await user.click(screen.getByRole('button', { name: "Copy Today's Score" }));
    await waitFor(() => {
      expect(copied).toBe(
        'The Daily Score | Sep 30, 2026\n\nWordle\n3/6\n\n.https://thedailyscore.site.'
      );
    });
    expect(toast.success).toHaveBeenCalledWith('Copied');

    document.execCommand = jest.fn(() => false);
    await user.click(screen.getByRole('button', { name: "Copy Today's Score" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Could not copy');
    });

    document.execCommand = jest.fn(() => true);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ on: '2026-09-30', scores: [] }) });
    view.unmount();
    renderHome(reader);
    await waitFor(() => {
      expect(global.fetch.mock.calls.filter((call) => String(call[0]).includes('/api/scores/today')).length).toBeGreaterThan(1);
    });
    await user.click(screen.getByRole('button', { name: "Copy Today's Score" }));
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Nothing filed today.');
    });
    expect(document.execCommand).not.toHaveBeenCalled();
    delete document.execCommand;
  });

  test('pulling down on iOS reloads the feed', async () => {
    const { Capacitor } = require('@capacitor/core');
    Capacitor.isNativePlatform.mockReturnValue(true);
    Capacitor.getPlatform.mockReturnValue('ios');
    let feeds = 0;
    let releaseFeed = () => {};
    global.fetch.mockImplementation(async (url) => {
      if (String(url) === '/api/feed') {
        feeds += 1;
        if (feeds > 1) {
          await new Promise((resolve) => {
            releaseFeed = resolve;
          });
        }
        return { ok: true, status: 200, json: async () => ({ posts: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ scores: [] }) };
    });

    renderHome({ user_id: 4, handle: 'ada' });
    expect(await screen.findByText('No scores yet.')).toBeInTheDocument();
    const scroller = screen.getByTestId('home-scroller');
    const touch = (type, clientY) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'touches', { value: clientY == null ? [] : [{ clientY }] });
      scroller.dispatchEvent(event);
    };

    touch('touchstart', 0);
    touch('touchmove', 30);
    expect(await screen.findByRole('status')).toHaveTextContent('Pull');
    touch('touchend');
    expect(feeds).toBe(1);
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    touch('touchstart', 0);
    touch('touchmove', 160);
    expect(await screen.findByRole('status')).toHaveTextContent('Release');
    touch('touchend');
    expect(await screen.findByRole('status')).toHaveTextContent('Refreshing');
    expect(feeds).toBe(2);
    releaseFeed();
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('keeps a guest score on this device', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/preview')) {
        return { ok: true, json: async () => ({ ...previewPayload, played_on: '2026-11-19', groups: [] }) };
      }
      return { ok: true, json: async () => ({ posts: [] }) };
    });
    renderHome();
    await user.type(screen.getByLabelText('Result'), krillionPaste);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(await screen.findByRole('button', { name: 'Post' }));
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Best all time.');
    });
    expect(global.fetch.mock.calls.some((call) => String(call[0]) === '/api/scores' && call[1]?.method === 'POST')).toBe(false);
    expect(await screen.findByText('Guest')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Result'), krillionPaste);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    await user.click(await screen.findByRole('button', { name: 'Post' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("you've already uploaded this score");
  });
});
