import { AUTH_USER_KEY, cacheDelete, cacheGet, cacheSet } from '../utils/sessionCache';

const RETRY_KEY = 'ds:session-retry';

const listeners = new Set();

let inflight = null;

export const sessionDocument = {
  reload() {
    window.location.reload();
  },
};

export function onSessionLost(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearSessionRetry() {
  try {
    sessionStorage.removeItem(RETRY_KEY);
  } catch {
    /* private mode */
  }
}

export function resetSessionClientForTests() {
  inflight = null;
  listeners.clear();
}

function armReload() {
  try {
    if (sessionStorage.getItem(RETRY_KEY) === '1') return false;
    sessionStorage.setItem(RETRY_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

function dropSession() {
  cacheDelete(AUTH_USER_KEY);
  clearSessionRetry();
  listeners.forEach((listener) => listener());
}

function hang() {
  return new Promise(() => {});
}

/**
 * A saved reader means this browser was signed in. One document reload lets Safari
 * attach the session cookie again. A second miss clears that reader.
 */
export function settleUnauthorized() {
  if (cacheGet(AUTH_USER_KEY) && armReload()) {
    sessionDocument.reload();
    return hang();
  }
  dropSession();
  return null;
}

export async function readSession() {
  const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
  if (res.status === 401) return { status: 401, user: null };
  if (!res.ok) return { status: res.status || 0, user: null };
  const data = await res.json().catch(() => ({}));
  const user = data.user || null;
  if (!user) return { status: 401, user: null };
  cacheSet(AUTH_USER_KEY, user);
  return { status: 200, user };
}

async function resolveCurrentUser() {
  const session = await readSession();
  if (session.user) {
    clearSessionRetry();
    return session.user;
  }
  if (session.status === 401) {
    const pending = settleUnauthorized();
    if (pending) return pending;
    return null;
  }
  return null;
}

export function fetchCurrentUser() {
  if (!inflight) {
    inflight = resolveCurrentUser().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function apiFetch(url, options = {}) {
  const init = { cache: 'no-store', ...options, credentials: 'include' };
  const res = await fetch(url, init);
  if (res.status !== 401) return res;

  const session = await readSession();
  if (session.user) {
    clearSessionRetry();
    const retry = await fetch(url, init);
    if (retry.status !== 401) return retry;
    dropSession();
    return hang();
  }

  const pending = settleUnauthorized();
  if (pending) return pending;
  return hang();
}

export async function apiJson(url, options = {}) {
  const res = await apiFetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function readPayload(text) {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

function sendForm(url, body, onProgress) {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.withCredentials = true;
    if (xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (!onProgress || !event.lengthComputable || event.total <= 0) return;
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      };
    }
    xhr.onload = () => {
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        data: readPayload(xhr.responseText),
      });
    };
    xhr.onerror = () => resolve({ ok: false, status: 0, data: {} });
    xhr.send(body);
  });
}

export async function apiUpload(url, body, onProgress) {
  let result = await sendForm(url, body, onProgress);
  if (result.status !== 401) return result;

  const session = await readSession();
  if (session.user) {
    clearSessionRetry();
    result = await sendForm(url, body, onProgress);
    if (result.status !== 401) return result;
    dropSession();
    return hang();
  }

  const pending = settleUnauthorized();
  if (pending) return pending;
  return hang();
}
