import React from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectAuthLoading, selectIsAuthenticated, selectUser } from '../../store/auth.reducer';
import { needsHandle } from '../../helpers/identity';
import Loading from '../Loading/Loading';
import Masthead from './Masthead';
import { MobileTabBar } from '../Nav/DeskNav';

const GUEST_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/terms',
  '/privacy',
]);

const ContentArea = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const showChrome = isAuthenticated && !needsHandle(user);

  if (isLoading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!showChrome) {
    const guestShell = GUEST_PATHS.has(pathname) || pathname.startsWith('/reset-password');
    return (
      <div data-testid="content-pane" className="app-shell overflow-y-auto">
        <div className={guestShell ? 'min-h-dvh' : 'min-h-dvh px-margin py-space-lg'}>{children}</div>
      </div>
    );
  }

  const fill = (pathname.startsWith('/groups') && !pathname.endsWith('/governance')) || pathname === '/messages';

  return (
    <div data-testid="content-pane" className="app-shell bg-background">
      <Masthead />
      <main className={`flex min-h-0 flex-1 flex-col px-margin py-space-lg md:px-margin-desktop ${fill ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={fill ? 'flex h-full min-h-0 flex-col' : undefined}>{children}</div>
      </main>
      <MobileTabBar />
    </div>
  );
};

export default ContentArea;
