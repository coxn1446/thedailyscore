import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import Post from '../routes/Post';
import rootReducer from '../store/rootReducer';

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const post = {
  score_id: 3,
  puzzle_number: 74,
  snippet: '🐟',
  score: 355,
  guesses: null,
  solved: true,
  image_url: null,
  like_count: 0,
  liked: false,
  comment_count: 0,
  user: { user_id: 8, handle: 'bea', display_name: 'Bea', portrait_url: null },
  game: { slug: 'krillion', name: 'Krillion', rank_basis: 'score', guess_cap: null },
};

const renderPost = () => {
  const store = configureStore({
    reducer: rootReducer,
    preloadedState: {
      auth: { user: { user_id: 4, handle: 'ada' }, isAuthenticated: true, isLoading: false },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/post/3']}>
        <Routes>
          <Route path="/post/:scoreId" element={<Post />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

describe('Post', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    toast.error.mockClear();
    URL.createObjectURL = jest.fn(() => 'blob:preview');
    URL.revokeObjectURL = jest.fn();
  });

  test('shows the score with the comment list already open', async () => {
    const user = userEvent.setup();
    global.fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path === '/api/feed/3') return { ok: true, status: 200, json: async () => ({ post }) };
      if (path.endsWith('/comments') && options.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            comment: {
              comment_id: 9,
              body: body.body,
              image_url: body.image_url || null,
              user: { user_id: 4, handle: 'ada', display_name: 'Ada' },
            },
          }),
        };
      }
      if (path.endsWith('/comments')) return { ok: true, status: 200, json: async () => ({ comments: [] }) };
      if (path === '/api/uploads') {
        return { ok: true, status: 201, json: async () => ({ media: { media_url: '/uploads/desk.png' } }) };
      }
      if (path.endsWith('/comments/9')) return { ok: true, status: 200, json: async () => ({ ok: true }) };
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });

    renderPost();
    expect(await screen.findByText('355')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Krillion/ })).toHaveAttribute('href', '/board?game=krillion&period=today');
    expect(screen.getByLabelText('Comment')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Comment'), 'sharp');
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(await screen.findByText('sharp')).toBeInTheDocument();

    const file = new File(['img'], 'desk.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Picture'), file);
    expect(await screen.findByRole('img', { name: 'Preview' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(await screen.findByRole('img', { name: 'Picture' })).toHaveAttribute('src', '/uploads/desk.png');

    const posted = global.fetch.mock.calls.find((call) => String(call[0]).endsWith('/comments') && call[1]?.method === 'POST');
    expect(JSON.parse(posted[1].body).body).toBe('sharp');

    await user.click(screen.getAllByRole('button', { name: 'Delete' })[0]);
    await waitFor(() => {
      expect(screen.queryByText('sharp')).not.toBeInTheDocument();
    });
  });

  test('shows upload progress and opens the picture', async () => {
    const user = userEvent.setup();
    let releaseUpload = () => {};
    const gate = new Promise((resolve) => {
      releaseUpload = resolve;
    });
    global.fetch.mockImplementation(async (url, options = {}) => {
      const path = String(url);
      if (path === '/api/feed/3') return { ok: true, status: 200, json: async () => ({ post }) };
      if (path.endsWith('/comments') && options.method === 'POST') {
        const body = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            comment: {
              comment_id: 9,
              body: body.body,
              image_url: body.image_url || null,
              user: { user_id: 4, handle: 'ada', display_name: 'Ada' },
            },
          }),
        };
      }
      if (path.endsWith('/comments')) return { ok: true, status: 200, json: async () => ({ comments: [] }) };
      if (path === '/api/uploads') {
        await gate;
        return { ok: true, status: 201, json: async () => ({ media: { media_url: '/uploads/desk.png' } }) };
      }
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });

    renderPost();
    expect(await screen.findByLabelText('Comment')).toBeInTheDocument();
    const file = new File(['img'], 'desk.png', { type: 'image/png' });
    await user.upload(screen.getByLabelText('Picture'), file);
    await user.click(screen.getByRole('button', { name: 'Open preview' }));
    expect(screen.getByRole('dialog', { name: 'Picture' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Post' }));
    expect(await screen.findByRole('progressbar', { name: 'Uploading' })).toBeInTheDocument();
    releaseUpload();
    expect(await screen.findByRole('img', { name: 'Picture' })).toHaveAttribute('src', '/uploads/desk.png');
    expect(screen.queryByRole('progressbar', { name: 'Uploading' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Open picture' }));
    const dialog = screen.getByRole('dialog', { name: 'Picture' });
    expect(dialog).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Larger' })).not.toBeInTheDocument();
    expect(dialog.querySelector('img')).toHaveClass('max-h-full', 'max-w-full');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog', { name: 'Picture' })).not.toBeInTheDocument();
  });

  test('shows your score and share grid beside theirs', async () => {
    global.fetch.mockImplementation(async (url) => {
      if (String(url) === '/api/feed/3') {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            post,
            viewer_score: {
              score_id: 9,
              score: 400,
              guesses: null,
              solved: true,
              snippet: '🦑',
              game: post.game,
            },
          }),
        };
      }
      if (String(url).endsWith('/comments')) return { ok: true, status: 200, json: async () => ({ comments: [] }) };
      return { ok: false, status: 500, json: async () => ({ error: 'Request failed' }) };
    });
    renderPost();
    expect(await screen.findByRole('columnheader', { name: 'User' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Result' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Score' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bea' })).toHaveAttribute('href', '/profile/bea');
    expect(screen.getByRole('link', { name: 'ada' })).toHaveAttribute('href', '/profile');
    const mark = screen.getByRole('img', { name: 'The Daily Score' });
    expect(mark).toBeInTheDocument();
    expect(mark.parentElement).toHaveClass('wordmark-plate');
    expect(screen.getByText('(AVG)')).toBeInTheDocument();
    expect(screen.getByText('355')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
    expect(screen.getByText('🐟')).toBeInTheDocument();
    expect(screen.getByText('🦑')).toBeInTheDocument();
  });

  test('reports a missing score', async () => {
    global.fetch.mockResolvedValue({ ok: false, status: 404, json: async () => ({ error: 'Score not found' }) });
    renderPost();
    expect(await screen.findByRole('alert')).toHaveTextContent('Score not found');
  });
});