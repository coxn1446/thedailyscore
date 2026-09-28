import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GroupParlor from '../components/Groups/GroupParlor';
import { fetchParlor, postParlorMessage } from '../helpers/parlorHelpers';
import { getSocket } from '../helpers/socketHelpers';

jest.mock('../helpers/parlorHelpers', () => ({
  fetchParlor: jest.fn(),
  postParlorMessage: jest.fn(),
}));

jest.mock('../helpers/socketHelpers', () => ({
  getSocket: jest.fn(),
}));

describe('GroupParlor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSocket.mockReturnValue(null);
  });

  test('adds keyboard room under the composer on a phone', async () => {
    const user = userEvent.setup();
    window.matchMedia.mockImplementation((query) => ({
      matches: String(query).includes('max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    fetchParlor.mockResolvedValue({ messages: [], before: null });

    render(<GroupParlor groupId={10} gameSlug="krillion" />);
    const field = await screen.findByLabelText('Message');
    expect(field).not.toHaveFocus();
    const composer = screen.getByTestId('parlor-composer');
    expect(composer.className).not.toContain('fixed');
    await user.click(field);
    expect(composer.className).not.toContain('fixed');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(composer.className).toContain('fixed');
    expect(composer.style.bottom).not.toBe('320px');
    await act(async () => {
      field.blur();
    });
    expect(composer.className).not.toContain('fixed');
  });

  test('shows an empty parlor and posts a message', async () => {
    const user = userEvent.setup();
    fetchParlor.mockResolvedValue({ messages: [], before: null });
    postParlorMessage.mockResolvedValue({
      message: {
        message_id: 3,
        group_id: 10,
        user_id: 4,
        display_name: 'Ada',
        body: 'Good morning',
        created_at: '2026-09-28T14:00:00.000Z',
      },
    });

    render(<GroupParlor groupId={10} gameSlug="krillion" />);
    expect(await screen.findByRole('heading', { name: 'The parlor is quiet.' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Message'), 'Good morning');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Good morning')).toBeInTheDocument();
    expect(postParlorMessage).toHaveBeenCalledWith(10, 'krillion', 'Good morning');
  });

  test('appends a live message from the other member', async () => {
    const handlers = {};
    getSocket.mockReturnValue({
      on: (event, handler) => {
        handlers[event] = handler;
      },
      off: jest.fn(),
    });
    fetchParlor.mockResolvedValue({
      messages: [{
        message_id: 1,
        group_id: 10,
        user_id: 4,
        display_name: 'Ada',
        body: 'First',
        created_at: '2026-09-28T14:00:00.000Z',
      }],
      before: null,
    });

    render(<GroupParlor groupId={10} gameSlug="krillion" />);
    const body = await screen.findByText('First');
    expect(body.parentElement).toContainElement(screen.getByRole('button', { name: 'Add reaction' }));
    await act(async () => {
      handlers['parlor:message']({
        message_id: 2,
        group_id: 10,
        user_id: 8,
        display_name: 'Bea',
        body: 'From the other desk',
        created_at: '2026-09-28T14:01:00.000Z',
      });
    });
    expect(await screen.findByText('From the other desk')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Bea')).toBeInTheDocument();
    });
  });

  test('links Home when the game has not been posted today', async () => {
    fetchParlor.mockRejectedValue(new Error('Not posted today'));

    render(
      <MemoryRouter>
        <GroupParlor groupId={10} gameSlug="maptap" />
      </MemoryRouter>
    );

    expect(await screen.findByText(/haven't played this game yet today, submit your score/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'here' })).toHaveAttribute('href', '/');
    expect(screen.queryByLabelText('Message')).not.toBeInTheDocument();
  });
});
