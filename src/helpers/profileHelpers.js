import { AUTH_USER_KEY, cacheClear, cacheSet } from '../utils/sessionCache';
import { apiFetch, apiJson, apiUpload } from './sessionClient';

const request = (url, options = {}) => apiJson(url, options);

const rememberUser = (user) => {
  if (user) cacheSet(AUTH_USER_KEY, user);
};

export const fetchProfile = (period = 'all') => request(`/api/profile?period=${period}`);

export const fetchPlayer = (handle) => request(`/api/profile/player/${encodeURIComponent(handle)}`);

export const fetchMyGames = () => request('/api/profile/games');

export const saveMyGames = (games) =>
  request('/api/profile/games', { method: 'PUT', body: JSON.stringify({ games }) });

export const updateProfile = async (body) => {
  const data = await request('/api/profile', { method: 'PATCH', body: JSON.stringify(body) });
  rememberUser(data.user);
  return data;
};

export const uploadPortrait = async (file, onProgress) => {
  const body = new FormData();
  body.append('file', file);
  const result = await apiUpload('/api/uploads', body, onProgress);
  if (!result?.ok) throw new Error(result?.data?.error || 'Could not upload portrait');
  return result.data?.media?.media_url || '';
};

export const exportScores = async () => {
  const res = await apiFetch('/api/profile/export');
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
  const res = await apiFetch('/api/profile', { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not delete account');
  cacheClear();
  return data;
};
