let registeredToken = '';

const readJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const registerDevice = async (token, platform) => {
  const value = typeof token === 'string' ? token.trim() : '';
  if (!value) return null;
  const res = await fetch('/api/devices', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: value, platform }),
  });
  const data = await readJson(res);
  registeredToken = value;
  return data;
};

export const removeRegisteredDevice = async () => {
  const token = registeredToken;
  if (!token) return null;
  registeredToken = '';
  const res = await fetch('/api/devices', {
    method: 'DELETE',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  return readJson(res);
};

export const currentDeviceToken = () => registeredToken;
