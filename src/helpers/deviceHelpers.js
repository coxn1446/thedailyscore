import { apiFetch } from './sessionClient';

let registeredToken = '';

const readJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const noteRegistration = (pending, raw) => {
  const current = pending && typeof pending === 'object' ? pending : {};
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return { token: current.token || '', fcmToken: current.fcmToken || '' };
  if (value.startsWith('FCM:')) {
    return { token: current.token || '', fcmToken: value.slice(4).trim() };
  }
  return { token: value, fcmToken: current.fcmToken || '' };
};

export const registerDevice = async (token, fcmToken, platform) => {
  const value = typeof token === 'string' ? token.trim() : '';
  const fcm = typeof fcmToken === 'string' ? fcmToken.trim() : '';
  if (!value || !fcm) return null;
  const res = await apiFetch('/api/devices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: value, fcm_token: fcm, platform }),
  });
  const data = await readJson(res);
  registeredToken = value;
  return data;
};

export const removeRegisteredDevice = async () => {
  const token = registeredToken;
  if (!token) return null;
  registeredToken = '';
  const res = await apiFetch('/api/devices', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return readJson(res);
};

export const currentDeviceToken = () => registeredToken;
