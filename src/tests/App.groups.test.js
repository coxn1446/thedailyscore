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

  test('sends a guest from an invite link to sign-in and keeps the path', async () => {
    const store = configureStore({ reducer: rootReducer });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/join/invite-token']}>
          <LocationEcho />
          <App />
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/login?next=%2Fjoin%2Finvite-token');
  });
});