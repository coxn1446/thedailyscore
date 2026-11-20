import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import App from '../components/App';
import rootReducer from '../store/rootReducer';

const LocationEcho = () => {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
};

describe('join auth gate', () => {
  beforeEach(() => {
    global.fetch = jest.fn(async (url) => {
      if (String(url).includes('/api/auth/config')) {
        return { ok: true, json: async () => ({ googleClientId: null, appleClientId: null }) };
      }
      return { ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) };
    });
  });

  test('opens the board for a guest from an old invite link', async () => {
    global.fetch = jest.fn(async (url) => {
      const path = String(url);
      if (path.includes('/api/auth/config')) {
        return { ok: true, json: async () => ({ googleClientId: null, appleClientId: null }) };
      }
      if (path.includes('/api/board') || path.includes('/api/feed')) {
        return { ok: true, status: 200, json: async () => ({ games: [], standings: [], board: null, posts: [] }) };
      }
      return { ok: false, status: 401, json: async () => ({ error: 'Not authenticated' }) };
    });
    const store = configureStore({ reducer: rootReducer });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/join/invite-token']}>
          <LocationEcho />
          <App />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByRole('button', { name: 'Global' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/board');
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});