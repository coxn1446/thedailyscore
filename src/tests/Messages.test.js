import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Messages from '../routes/Messages';

const renderMessages = () => render(
  <MemoryRouter>
    <Messages />
  </MemoryRouter>
);

describe('Messages', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('shows the game mark, group, and up to three recent portraits', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        conversations: [{
          group_id: 10,
          group_name: 'Agawam Trivia',
          slug: 'krillion',
          game_name: 'Krillion',
          unread_count: 1,
          last_message: 'should not render',
          recent_chatters: [
            { user_id: 8, display_name: 'Bea', handle: 'bea', portrait_url: '/uploads/bea.png' },
            { user_id: 9, display_name: 'Cy', handle: 'cy', portrait_url: null },
            { user_id: 10, display_name: 'Dee', handle: 'dee', portrait_url: '/uploads/dee.png' },
            { user_id: 11, display_name: 'Eve', handle: 'eve', portrait_url: '/uploads/eve.png' },
          ],
        }, {
          group_id: 11,
          group_name: 'Map club',
          slug: 'map-tap',
          game_name: 'Map Tap',
          unread_count: 0,
          recent_chatters: [],
        }, {
          group_id: 12,
          group_name: 'Heights',
          slug: 'size-it-up',
          game_name: 'Size it Up',
          unread_count: 0,
          recent_chatters: [],
        }, {
          group_id: 13,
          group_name: 'Letters',
          slug: 'wordle',
          game_name: 'Wordle',
          unread_count: 0,
          recent_chatters: [],
        }, {
          group_id: 14,
          group_name: 'Future',
          slug: 'quordle',
          game_name: 'Quordle',
          unread_count: 0,
          recent_chatters: [],
        }],
      }),
    });

    renderMessages();
    const row = await screen.findByRole('link', { name: /Agawam Trivia/ });
    expect(row).toHaveAttribute('href', '/groups/10?game=krillion&chat=1');
    expect(row).toHaveClass('py-space-lg');
    expect(screen.getByLabelText('Krillion')).toHaveTextContent('🦐');
    expect(screen.getByLabelText('Map Tap')).toHaveTextContent('🌐');
    expect(screen.getByLabelText('Size it Up')).toHaveTextContent('📈');
    expect(screen.getByLabelText('Wordle')).toHaveTextContent('🟩');
    expect(screen.getByLabelText('Quordle')).toHaveTextContent('Quordle');
    expect(screen.queryByText('Game Name')).not.toBeInTheDocument();
    expect(screen.queryByText('Latest Message')).not.toBeInTheDocument();
    expect(screen.queryByText('should not render')).not.toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Unread' })).toBeInTheDocument();
    const portraits = row.querySelectorAll('img.portrait, span.portrait');
    expect(portraits).toHaveLength(3);
    expect(portraits[0]).toHaveAttribute('src', '/uploads/bea.png');
    expect(portraits[1]).toHaveTextContent('C');
    expect(portraits[2]).toHaveAttribute('src', '/uploads/dee.png');
  });

  test('slides that conversation over the list on a phone', async () => {
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
    global.fetch.mockImplementation(async (url) => {
      if (String(url).includes('/parlor/')) {
        return { ok: true, json: async () => ({ messages: [], before: null, unread_count: 0 }) };
      }
      return {
        ok: true,
        json: async () => ({
          conversations: [{
            group_id: 10,
            group_name: 'Agawam Trivia',
            slug: 'krillion',
            game_name: 'Krillion',
            unread_count: 0,
            recent_chatters: [],
          }],
        }),
      };
    });

    renderMessages();
    expect(screen.queryByRole('link', { name: /Agawam Trivia/ })).not.toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /Agawam Trivia/ }));
    expect(await screen.findByRole('heading', { name: 'Agawam Trivia - Krillion' })).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Agawam Trivia/ })).not.toBeInTheDocument();
  });

  test('shows an empty desk and a load error', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ conversations: [] }) });
    const { unmount } = renderMessages();
    expect(await screen.findByRole('heading', { name: 'No messages.' })).toBeInTheDocument();
    unmount();

    global.fetch.mockRejectedValue(new Error('offline'));
    renderMessages();
    expect(await screen.findByRole('alert')).toHaveTextContent('offline');
  });
});
