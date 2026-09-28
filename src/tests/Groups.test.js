import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Groups from '../routes/Groups';
import authReducer from '../store/auth.reducer';

jest.mock('../helpers/parlorHelpers', () => ({
  fetchConversations: jest.fn(() => Promise.resolve({ conversations: [] })),
  fetchParlor: jest.fn(() => Promise.resolve({ messages: [], before: null })),
  postParlorMessage: jest.fn(),
  markParlorRead: jest.fn(() => new Promise(() => {})),
}));

jest.mock('../helpers/groupHelpers', () => ({
  fetchGroups: jest.fn(),
  fetchGroup: jest.fn(),
  charterGroup: jest.fn(),
  fetchGroupDay: jest.fn(),
}));

const { fetchGroups, fetchGroup, charterGroup, fetchGroupDay } = require('../helpers/groupHelpers');
const { fetchConversations, fetchParlor } = require('../helpers/parlorHelpers');

const games = [
  { game_id: 1, slug: 'wordle', name: 'Wordle', sort_direction: 'lower', sort_order: 1 },
  { game_id: 2, slug: 'krillion', name: 'Krillion', sort_direction: 'lower', sort_order: 2 },
  { game_id: 4, slug: 'map-tap', name: 'Map Tap', sort_direction: 'higher', sort_order: 4 },
];

const renderGroups = (path = '/groups') => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user: { user_id: 4 }, isAuthenticated: true, isLoading: false },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/groups" element={<Groups />} />
          <Route path="/groups/:groupId" element={<Groups />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const desktopMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

describe('Groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.matchMedia.mockImplementation(desktopMedia);
  });

  test('shows an empty directory and charters the checked games', async () => {
    const user = userEvent.setup();
    fetchGroups.mockResolvedValueOnce({ groups: [], games });
    charterGroup.mockResolvedValue({ group: { group_id: 9, name: 'Sunday desk' } });
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 9,
          name: 'Sunday desk',
          member_count: 1,
          score_count_today: 0,
          enabled_games: [
            { slug: 'wordle', name: 'Wordle' },
            { slug: 'krillion', name: 'Krillion' },
          ],
        },
      ],
      games,
    });
    fetchGroup.mockResolvedValue({
      group: {
        group_id: 9,
        name: 'Sunday desk',
        tagline: 'A weekly register',
        member_count: 1,
        score_count_today: 0,
        archived: false,
        role: 'curator',
      },
      games: games.map((game) => ({
        ...game,
        enabled: game.slug === 'wordle' || game.slug === 'krillion',
      })),
      members: [],
    });

    renderGroups();
    expect(await screen.findByRole('heading', { name: 'No syndicates.' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Wordle' }));
    await user.click(screen.getByRole('checkbox', { name: 'Krillion' }));
    await user.type(screen.getByLabelText('Name'), 'Sunday desk');
    await user.type(screen.getByLabelText('Tagline'), 'A weekly register');
    await user.click(screen.getByRole('button', { name: 'Create a Group' }));

    await waitFor(() => {
      expect(charterGroup).toHaveBeenCalledWith({
        name: 'Sunday desk',
        tagline: 'A weekly register',
        handles: '',
        games: ['wordle', 'krillion'],
      });
    });
    expect(await screen.findByRole('heading', { name: 'Sunday desk' })).toBeInTheDocument();
    expect(screen.getByText('Nothing filed today.')).toBeInTheDocument();
    expect(screen.getAllByText('0/1').length).toBeGreaterThan(0);
  });

  test('shows the directory and the selected group', async () => {
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 3,
          name: 'Sunday desk',
          member_count: 2,
          score_count_today: 0,
          unread_count: 2,
          enabled_games: [{ slug: 'wordle', name: 'Wordle' }],
        },
      ],
      games,
    });
    fetchConversations.mockResolvedValue({
      conversations: [{
        group_id: 3,
        group_name: 'Sunday desk',
        slug: 'wordle',
        game_name: 'Wordle',
        unread_count: 2,
      }],
    });
    fetchGroup.mockResolvedValue({
      group: {
        group_id: 3,
        name: 'Sunday desk',
        tagline: 'A weekly register',
        member_count: 2,
        score_count_today: 0,
        archived: false,
        role: 'fellow',
      },
      games: games.map((game) => ({
        ...game,
        rank_basis: game.slug === 'wordle' ? 'guesses' : 'score',
        board: game.slug === 'wordle' ? 'weekly' : 'daily',
        min_entries: game.slug === 'wordle' ? 4 : null,
        enabled: game.slug === 'wordle' || game.slug === 'krillion',
      })),
      members: [],
    });

    const user = userEvent.setup();
    renderGroups('/groups/3');
    expect(await screen.findByRole('heading', { name: 'Sunday desk' })).toBeInTheDocument();
    expect(screen.getAllByText('0/2').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/groups/3/governance');
    expect(screen.getByRole('heading', { name: 'Nothing filed today.' })).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: 'Unread' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parlor' })).toHaveTextContent('2');
    expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Map Tap' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByRole('heading', { name: 'Four scores make the board.' })).toBeInTheDocument();
  });

  test('keeps the game when switching groups and shows the published score', async () => {
    const user = userEvent.setup();
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 2,
          name: 'Agawam Trivia',
          member_count: 2,
          score_count_today: 1,
          enabled_games: [
            { slug: 'krillion', name: 'Krillion' },
            { slug: 'wordle', name: 'Wordle' },
          ],
          standings: [{ slug: 'krillion', daily_rank: 1, weekly_rank: 2, all_time_rank: 3 }],
        },
        {
          group_id: 3,
          name: 'Broback Mountain',
          member_count: 2,
          score_count_today: 1,
          enabled_games: [
            { slug: 'krillion', name: 'Krillion' },
            { slug: 'wordle', name: 'Wordle' },
          ],
          standings: [{ slug: 'krillion', daily_rank: 1, weekly_rank: 1, all_time_rank: 1 }],
        },
        {
          group_id: 4,
          name: 'Quiet desk',
          member_count: 1,
          score_count_today: 0,
          enabled_games: [{ slug: 'wordle', name: 'Wordle' }],
          standings: [],
        },
      ],
      games,
    });
    fetchGroup.mockImplementation(async (groupId, slug) => ({
      group: {
        group_id: Number(groupId),
        name: Number(groupId) === 3 ? 'Broback Mountain' : 'Agawam Trivia',
        member_count: 2,
        score_count_today: 1,
        archived: false,
        role: 'fellow',
      },
      games: games.map((game) => ({
        ...game,
        rank_basis: game.slug === 'wordle' ? 'guesses' : 'score',
        board: game.slug === 'wordle' ? 'weekly' : 'daily',
        min_entries: game.slug === 'wordle' ? 4 : null,
        enabled: game.slug === 'krillion' || game.slug === 'wordle',
      })),
      board: slug === 'krillion'
        ? {
            slug: 'krillion',
            name: 'Krillion',
            enabled: true,
            board: 'daily',
            rank_basis: 'score',
            daily_rank: 1,
            weekly_rank: 1,
            entries: [
              {
                user_id: 4,
                display_name: 'Will',
                rank: 1,
                score: 230,
                puzzle_number: 74,
                snippet: '🐟🫧🏮',
                played_on: '2026-09-27',
                updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                mine: true,
              },
            ],
          }
        : {
            slug,
            name: slug === 'wordle' ? 'Wordle' : slug,
            enabled: true,
            board: slug === 'wordle' ? 'weekly' : 'daily',
            rank_basis: slug === 'wordle' ? 'guesses' : 'score',
            entries: [],
            daily_entries: [],
            weekly_entries: [],
          },
    }));

    fetchGroupDay.mockResolvedValue({
      slug: 'krillion',
      offset: 1,
      on: '2026-09-26',
      enabled: true,
      entries: [
        {
          user_id: 8,
          display_name: 'Ada',
          rank: 1,
          score: 90,
          puzzle_number: 73,
          snippet: '',
          updated_at: null,
        },
      ],
    });

    renderGroups('/groups/2?game=krillion');
    expect(await screen.findByText('230')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Daily Rank' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Weekly Rank' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'All Time Rank' })).toBeInTheDocument();
    expect(screen.getByText('Will - Sep 27, 2026')).toBeInTheDocument();
    expect(screen.getByText('🐟🫧🏮')).toBeInTheDocument();
    expect(screen.getAllByText('1st').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Earlier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Quiet desk/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Krillion' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Wordle' }));
    await waitFor(() => {
      expect(screen.queryByText('230')).not.toBeInTheDocument();
    });
    expect(screen.queryByText('90')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wordle' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Krillion' }));
    expect(await screen.findByText('230')).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /Broback Mountain/ }));
    expect(await screen.findByRole('heading', { name: 'Broback Mountain' })).toBeInTheDocument();
    expect(screen.getByText('230')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Krillion' })).toHaveAttribute('aria-pressed', 'true');
    expect(fetchGroup).toHaveBeenCalledWith('3', 'krillion', '', '');

    await user.click(screen.getByRole('button', { name: 'Week' }));
    expect(screen.getByText('2nd')).toBeInTheDocument();
  });

  test('drops a game no remaining group plays', async () => {
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 3,
          name: 'Sunday desk',
          member_count: 2,
          score_count_today: 0,
          enabled_games: [{ slug: 'wordle', name: 'Wordle' }],
        },
      ],
      games,
    });
    fetchGroup.mockResolvedValue({
      group: {
        group_id: 3,
        name: 'Sunday desk',
        member_count: 2,
        score_count_today: 0,
        archived: false,
        role: 'fellow',
      },
      games: games.map((game) => ({
        ...game,
        board: game.slug === 'wordle' ? 'weekly' : 'daily',
        enabled: game.slug === 'wordle',
      })),
      board: {
        slug: 'wordle',
        enabled: true,
        board: 'weekly',
        rank_basis: 'guesses',
        entries: [],
        weekly_entries: [],
      },
    });

    renderGroups('/groups/3?game=krillion');
    expect(await screen.findByRole('button', { name: 'Wordle' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Krillion' })).not.toBeInTheDocument();
  });

  test('opens Create a Group in a dialog on a narrow screen', async () => {
    const user = userEvent.setup();
    window.matchMedia.mockImplementation((query) => ({
      ...desktopMedia(query),
      matches: String(query).includes('max-width'),
    }));
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 3,
          name: 'Sunday desk',
          member_count: 1,
          score_count_today: 0,
          enabled_games: [{ slug: 'krillion', name: 'Krillion' }],
        },
      ],
      games,
    });

    renderGroups('/groups');
    expect(await screen.findByText('Sunday desk')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Create a Group' }));
    expect(screen.getByRole('dialog', { name: 'Create a Group' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
  });

  test('flips games inside the phone chat modal and locks an unposted game', async () => {
    const user = userEvent.setup();
    window.matchMedia.mockImplementation((query) => ({
      ...desktopMedia(query),
      matches: String(query).includes('max-width'),
    }));
    fetchGroups.mockResolvedValue({
      groups: [
        {
          group_id: 3,
          name: 'Sunday desk',
          member_count: 2,
          score_count_today: 1,
          enabled_games: [
            { slug: 'wordle', name: 'Wordle' },
            { slug: 'krillion', name: 'Krillion' },
          ],
        },
      ],
      games,
    });
    fetchGroup.mockResolvedValue({
      group: {
        group_id: 3,
        name: 'Sunday desk',
        member_count: 2,
        archived: false,
        role: 'fellow',
      },
      games: [
        { slug: 'wordle', name: 'Wordle', sort_order: 1, enabled: true },
        { slug: 'krillion', name: 'Krillion', sort_order: 2, enabled: true },
      ],
      members: [],
      board: { slug: 'wordle', enabled: true, entries: [] },
    });
    fetchParlor.mockImplementation((_groupId, slug) => {
      if (slug === 'krillion') return Promise.reject(new Error('Not posted today'));
      return Promise.resolve({
        messages: [{
          message_id: 1,
          display_name: 'Ada',
          body: 'Good morning',
          created_at: '2026-09-28T14:00:00.000Z',
        }],
        before: null,
      });
    });

    renderGroups('/groups/3?game=wordle&chat=1');
    const chatGames = await screen.findByRole('navigation', { name: 'Chat games' });
    expect(within(chatGames).getByRole('button', { name: 'Wordle' })).toHaveAttribute('aria-pressed', 'true');
    const body = await screen.findByText('Good morning');
    expect(body.parentElement).toContainElement(screen.getByRole('button', { name: 'Add reaction' }));

    await user.click(within(chatGames).getByRole('button', { name: 'Krillion' }));
    expect(await screen.findByText(/haven't played this game yet today, submit your score/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute('href', '/');
    expect(within(chatGames).getByRole('button', { name: 'Krillion' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('heading', { name: 'Sunday desk - Krillion' })).toBeInTheDocument();
  });
});
