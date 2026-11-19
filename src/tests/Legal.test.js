import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import authReducer from '../store/auth.reducer';
import { AccountDeletion, Privacy, Support, TermsOfService } from '../routes/Legal';
import LegalLinks from '../components/Legal/LegalLinks';

const renderPage = (node) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter>{node}</MemoryRouter>
    </Provider>
  );
};

describe('Legal pages', () => {
  test('terms, privacy, and account deletion scroll inside the phone screen', () => {
    const { unmount } = renderPage(<TermsOfService />);
    const terms = screen.getByRole('article');
    expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Agreement' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Limitation of liability' })).toBeInTheDocument();
    expect(screen.getByText(/Effective November 16, 2026/)).toBeInTheDocument();
    expect(terms).toHaveClass('h-dvh', 'flex');
    expect(screen.getByRole('button', { name: 'Back' }).parentElement).toHaveClass('sticky', 'top-0', 'pt-safe-top', 'border-b');
    expect(terms.querySelector('.overflow-y-auto')).toHaveClass('pb-safe-bottom');
    expect(screen.getAllByRole('link', { name: 'Account Deletion' }).length).toBeGreaterThan(0);
    screen.getAllByRole('link', { name: 'Account Deletion' }).forEach((link) => {
      expect(link).toHaveAttribute('href', '/account-deletion');
    });
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    unmount();

    const privacy = renderPage(<Privacy />);
    expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Information you provide' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who can see it' })).toBeInTheDocument();
    expect(screen.getAllByText(/do not sell personal information/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('article')).toHaveClass('h-dvh');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Account Deletion' }).every((link) => (
      link.getAttribute('href') === '/account-deletion'
    ))).toBe(true);
    privacy.unmount();

    renderPage(<AccountDeletion />);
    expect(screen.getByRole('heading', { name: 'Account Deletion' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'How to delete your data' })).toBeInTheDocument();
    expect(screen.getByText(/Open Settings/)).toBeInTheDocument();
    expect(screen.getByText(/Choose Delete Profile/)).toBeInTheDocument();
    expect(screen.getByText(/you do not need an account to read it/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'williamwildernash@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:williamwildernash@gmail.com?subject=Delete%20my%20account'
    );
    expect(screen.getByRole('article')).toHaveClass('h-dvh');
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  });

  test('back returns to the page that opened the policy', async () => {
    const user = userEvent.setup();
    const store = configureStore({
      reducer: { auth: authReducer },
      preloadedState: { auth: { user: null, isAuthenticated: false, isLoading: false } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/login', '/account-deletion']} initialIndex={1}>
          <Routes>
            <Route path="/login" element={<h1>Sign in</h1>} />
            <Route path="/account-deletion" element={<AccountDeletion />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });

  test('support still points at the same address and the deletion page', () => {
    renderPage(<Support />);
    expect(screen.getByRole('heading', { name: 'Support' })).toBeInTheDocument();
    expect(screen.getByText(/if you have any issues, email/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'williamwildernash@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:williamwildernash@gmail.com'
    );
    expect(screen.getAllByRole('link', { name: 'Account Deletion' }).every((link) => (
      link.getAttribute('href') === '/account-deletion'
    ))).toBe(true);
  });

  test('the shared legal links include account deletion', () => {
    renderPage(<LegalLinks />);
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms');
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: 'Account Deletion' })).toHaveAttribute('href', '/account-deletion');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
  });
});
