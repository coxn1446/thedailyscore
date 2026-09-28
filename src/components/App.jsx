import React, { lazy, Suspense, useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast, { Toaster } from 'react-hot-toast';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { clearUser, selectAuthLoading, selectIsAuthenticated, selectUser, setUser } from '../store/auth.reducer';
import { completeNativeOAuthSessionHandoff, fetchCurrentUser } from '../helpers/authHelpers';
import { needsHandle } from '../helpers/identity';
import { pathFromIncomingAppUrl, stripOAuthHandoffFromInternalPath } from '../utils/dailyScoreAppUrl';
import { safeInternalPath } from '../utils/internalPath';
import ContentArea from './Layout/ContentArea';
import Loading from './Loading/Loading';
import SocketWatcher from './Realtime/SocketWatcher';
import PushWatcher from './Realtime/PushWatcher';

const Home = lazy(() => import('../routes/Home'));
const Groups = lazy(() => import('../routes/Groups'));
const Messages = lazy(() => import('../routes/Messages'));
const GroupGovernance = lazy(() => import('../routes/GroupGovernance'));
const JoinGroup = lazy(() => import('../routes/JoinGroup'));
const Profile = lazy(() => import('../routes/Profile'));
const RequestGame = lazy(() => import('../routes/RequestGame'));
const Login = lazy(() => import('../routes/Login'));
const Register = lazy(() => import('../routes/Register'));
const ForgotPassword = lazy(() => import('../routes/ForgotPassword'));
const ResetPassword = lazy(() => import('../routes/ResetPassword'));
const VerifyEmail = lazy(() => import('../routes/VerifyEmail'));
const TermsOfService = lazy(() =>
  import('../routes/Legal').then((mod) => ({ default: mod.TermsOfService }))
);
const Privacy = lazy(() => import('../routes/Legal').then((mod) => ({ default: mod.Privacy })));

const GuestOnlyRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const [searchParams] = useSearchParams();

  if (isLoading) return <Loading />;
  if (isAuthenticated && needsHandle(user)) return <Navigate to="/register" replace />;
  if (isAuthenticated) {
    const next = safeInternalPath(searchParams.get('next'));
    return <Navigate to={next || '/'} replace />;
  }
  return children;
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  const location = useLocation();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (needsHandle(user)) return <Navigate to="/register" replace />;
  return children;
};

const IndexRoute = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const isLoading = useSelector(selectAuthLoading);
  const user = useSelector(selectUser);
  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (needsHandle(user)) return <Navigate to="/register" replace />;
  return <Home />;
};

const App = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const lastHandledAppUrlRef = useRef(null);

  useEffect(() => {
    const loadSession = async () => {
      const nextUser = await fetchCurrentUser();
      if (nextUser) dispatch(setUser(nextUser));
      else dispatch(clearUser());
    };
    loadSession();
  }, [dispatch]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let removed = false;
    let handle = null;

    const handleIncomingAppUrl = async (url) => {
      if (lastHandledAppUrlRef.current === url) return;
      lastHandledAppUrlRef.current = url;
      const path = pathFromIncomingAppUrl(url);
      if (!path) return;

      let handoffToken = null;
      try {
        handoffToken = new URL(url).searchParams.get('oauth_handoff');
      } catch {
        /* ignore */
      }

      if (handoffToken) {
        try {
          const nextUser = await completeNativeOAuthSessionHandoff(handoffToken);
          if (nextUser) dispatch(setUser(nextUser));
          else dispatch(clearUser());
        } catch {
          dispatch(clearUser());
        }
        try {
          await Browser.close();
        } catch {
          /* Browser may be unavailable in tests */
        }
        navigate(stripOAuthHandoffFromInternalPath(path), { replace: true });
        return;
      }

      navigate(path, { replace: true });
    };

    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        try {
          const launch = await CapApp.getLaunchUrl();
          if (launch?.url) await handleIncomingAppUrl(launch.url);
        } catch {
          /* getLaunchUrl optional */
        }
        const listener = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          await handleIncomingAppUrl(url);
        });
        if (removed) listener.remove();
        else handle = listener;
      } catch {
        /* @capacitor/app unavailable outside native builds */
      }
    })();

    return () => {
      removed = true;
      handle?.remove?.();
    };
  }, [dispatch, navigate]);

  return (
    <>
      <Toaster position="top-center" />
      <SocketWatcher />
      <PushWatcher />
      <ContentArea>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<IndexRoute />} />
            <Route
              path="/login"
              element={
                <GuestOnlyRoute>
                  <Login />
                </GuestOnlyRoute>
              }
            />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/groups"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId/governance"
              element={
                <ProtectedRoute>
                  <GroupGovernance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/groups/:groupId"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/join/:token"
              element={
                <ProtectedRoute>
                  <JoinGroup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/request-game"
              element={
                <ProtectedRoute>
                  <RequestGame />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ContentArea>
    </>
  );
};

export default App;
