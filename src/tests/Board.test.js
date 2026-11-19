import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Board from '../routes/Board';
import authReducer from '../store/auth.reducer';

jest.mock('../helpers/boardHelpers', () => ({
  fetchBoard: jest.fn(),
}));

jest.mock('../helpers/friendHelpers', () => ({
  fetchFriends: jest.fn(),
  requestFriend: jest.fn(),
  acceptFriend: jest.fn(),
  declineFriend: jest.fn(),
  removeFriend: jest.fn(),
}));

const { fetchBoard } = require('../helpers/boardHelpers');
const { fetchFriends } = require('../helpers/friendHelpers');

const payload = {
  scope: 'global',
  games: [{ game_id: 2, slug: 'krillion', name: 'Krillion', rank_basis: 'score', board: 'daily' }],
  standings: [{ slug: 'krillion', daily_rank: 2, weekly_rank: null, all_time_rank: null }],
    board: {
      slug: 'krillion',
      name: 'Krillion',
      enabled: true,
      rank_basis: 'score',
      daily_entries: [
        {
          user_id: 4,
          score_id: 1,
          handle: 'ada',
          display_name: 'Ada',
          rank: 2,
          score: 355,
          mine: true,
          played_on: '2026-11-16',
          snippet: '',
        },
        {
          user_id: 8,
          score_id: 2,
          handle: 'bea',
          display_name: 'Bea',
          rank: 1,
          score: 400,
          mine: false,
          played_on: '2026-11-16',
          snippet: '',
        },
      ],
    },
};

const renderBoard = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: { user: { user_id: 4, handle: 'ada' }, isAuthenticated: true, isLoading: false },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/board']}>
        <Board />
      </MemoryRouter>
    </Provider>
  );
};

describe('Board', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchBoard.mockResolvedValue(payload);
    fetchFriends.mockResolvedValue({ friends: [], incoming: [], outgoing: [] });
  });

  test('shows the global board and the friends request desk', async () => {
    const user = userEvent.setup();
    renderBoard();
    expect(await screen.findByRole('heading', { name: 'Krillion' })).toBeInTheDocument();
    const games = screen.getByRole('navigation', { name: 'Games' });
    expect(games).toHaveClass('overflow-x-auto');
    expect(games).not.toHaveClass('flex');
    expect(games.querySelector('.w-max')).toBeTruthy();
    expect(games.closest('.overflow-y-auto')).toBeNull();
    expect(screen.getAllByText('2nd').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Global' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Follow' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bea' })).toHaveAttribute('href', '/profile/bea');
    expect(screen.queryByRole('button', { name: 'Graphs' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Friends' }));
    expect(screen.getByRole('button', { name: 'Friends' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByPlaceholderText('handle')).not.toBeInTheDocument();
  });

  test('puts the all-time multiplier in the question mark', async () => {
    const user = userEvent.setup();
    fetchBoard.mockResolvedValue({
      ...payload,
      board: {
        ...payload.board,
        all_time_leaderboard: [
          {
            user_id: 8,
            score_id: 2,
            handle: 'bea',
            display_name: 'Bea',
            rank: 1,
            average: 100,
            multiplier: 40,
            weighted: 40,
            portrait_url: '/uploads/bea.png',
          },
        ],
      },
    });
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: {
        auth: { user: { user_id: 4, handle: 'ada' }, isAuthenticated: true, isLoading: false },
      },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/board?period=all&view=board']}>
          <Board />
        </MemoryRouter>
      </Provider>
    );
    expect(await screen.findByRole('link', { name: 'Bea' })).toBeInTheDocument();
    expect(screen.queryByText('Multiplier')).not.toBeInTheDocument();
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
    expect(document.querySelector('img.portrait')).toHaveClass('shrink-0');
    await user.click(screen.getByRole('button', { name: 'How this average is calculated' }));
    expect(screen.getByRole('tooltip')).toHaveTextContent('Multiplier 40%');
  });
});
