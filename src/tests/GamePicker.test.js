import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import GamePicker, { reorderGames } from '../components/Games/GamePicker';
import { clearGuest } from '../helpers/guestCache';
import rootReducer from '../store/rootReducer';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

describe('GamePicker', () => {
  beforeEach(() => {
    clearGuest();
  });

  test('shows a drag handle for each game', () => {
    const store = configureStore({
      reducer: rootReducer,
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <GamePicker onClose={() => {}} />
      </Provider>
    );
    expect(screen.getByRole('button', { name: 'Reorder Map Tap' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reorder Wordle' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Up' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Down' })).not.toBeInTheDocument();
  });

  test('moves a game in front of another', () => {
    const games = [
      { slug: 'map-tap', name: 'Map Tap' },
      { slug: 'krillion', name: 'Krillion' },
      { slug: 'wordle', name: 'Wordle' },
    ];
    expect(reorderGames(games, 'wordle', 'map-tap').map((game) => game.slug)).toEqual([
      'wordle',
      'map-tap',
      'krillion',
    ]);
    expect(reorderGames(games, 'wordle', 'wordle')).toBe(games);
  });
});
