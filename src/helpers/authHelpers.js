import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { AUTH_USER_KEY, cacheClear, cacheGet, cacheSet } from '../utils/sessionCache';
import { removeRegisteredDevice } from './deviceHelpers';

const rememberUser = (user) => {
  if (user) cacheSet(AUTH_USER_KEY, user);
};

export const fetchCurrentUser = async () => {
  const cached = cacheGet(AUTH_USER_KEY);
  if (cached) return cached;
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    const user = data.user || null;
    rememberUser(user);
    return user;
  } catch {
    return cacheGet(AUTH_USER_KEY) || null;
  }
};

export const loginWithPassword = async (identifier, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  rememberUser(data.user);
  return data.user;
};

export const registerWithPassword = async ({
  email,
  password,
  handle,
  displayName,
  timezone,
  acceptedPolicies,
}) => {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: typeof email === 'string' ? email.trim() : '',
      password,
      handle,
      displayName,
      timezone,
      acceptedPolicies: acceptedPolicies === true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  rememberUser(data.user);
  return data.user;
};

export const claimHandle = async ({ handle, timezone, displayName, acceptedPolicies }) => {
  const res = await fetch('/api/users/handle', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      handle,
      timezone,
      displayName,
      acceptedPolicies: acceptedPolicies === true,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not save handle');
  rememberUser(data.user);
  return data.user;
};

export const logout = async () => {
  try {
    await removeRegisteredDevice();
  } catch {
    /* still sign out */
  }
  cacheClear();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* ignore */
  }
};

export function appendReturnNativeIfCapacitor(path) {
  if (!Capacitor.isNativePlatform()) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}return_native=1`;
}

export function googleLoginUrl() {
  return appendReturnNativeIfCapacitor('/api/auth/google');
}

export function appleLoginUrl() {
  return appendReturnNativeIfCapacitor('/api/auth/apple');
}

export const completeNativeOAuthSessionHandoff = async (token) => {
  const res = await fetch('/api/auth/native-session-handoff', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not complete sign in');
  rememberUser(data.user);
  return data.user || null;
};

export const forgotPassword = async (email) => {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: typeof email === 'string' ? email.trim() : '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not send reset email');
  return data;
};

export const resetPassword = async ({ token, password }) => {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not reset password');
  return data;
};

export const verifyEmail = async (token) => {
  const res = await fetch('/api/auth/verify-email', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not verify email');
  if (data.user) rememberUser({ ...(cacheGet(AUTH_USER_KEY) || {}), ...data.user });
  return data;
};

export async function openSystemBrowserForOAuthStart(relativeHref) {
  if (!Capacitor.isNativePlatform()) return false;
  const path = relativeHref.startsWith('/') ? relativeHref : `/${relativeHref}`;
  const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
  if (!origin) return false;
  await Browser.open({ url: `${origin}${path}` });
  return true;
}
