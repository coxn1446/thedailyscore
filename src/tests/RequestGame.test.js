import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import RequestGame from '../routes/RequestGame';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const renderForm = () =>
  render(
    <MemoryRouter>
      <RequestGame />
    </MemoryRouter>
  );

describe('Request a game', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('files the named game for the caller', async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ request: { request_id: 1, game_name: 'Quordle' } }),
    });

    renderForm();
    await user.type(screen.getByLabelText('Game'), 'Quordle');
    await user.type(screen.getByLabelText('Note'), 'Share text attached');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Request filed');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/game-requests',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ game_name: 'Quordle', note: 'Share text attached' }),
      })
    );
  });
});
