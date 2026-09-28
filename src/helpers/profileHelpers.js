import { AUTH_USER_KEY, cacheClear, cacheSet } from '../utils/sessionCache';

const readJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

const request = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  return readJson(res);
};

const rememberUser = (user) => {
  if (user) cacheSet(AUTH_USER_KEY, user);
};

export const fetchProfile = (period = 'all') => request(`/api/profile?period=${period}`);

export const updateProfile = async (body) => {
  const data = await request('/api/profile', { method: 'PATCH', body: JSON.stringify(body) });
  rememberUser(data.user);
  return data;
};

export const uploadPortrait = async (file) => {
  const body = new FormData();
  body.append('file', file);
  const res = await fetch('/api/uploads', {
    method: 'POST',
    credentials: 'include',
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not upload portrait');
  return data.media?.media_url || '';
};

export const exportScores = async () => {
  const res = await fetch('/api/profile/export', { credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Could not export scores');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'scores.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const deleteAccount = async () => {
  const res = await fetch('/api/profile', { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not delete account');
  cacheClear();
  return data;
};
