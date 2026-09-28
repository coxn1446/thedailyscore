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

export const inviteUrl = (token) => `${window.location.origin}/join/${encodeURIComponent(token)}`;

const rangeQuery = (game, from, to) => {
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const text = params.toString();
  return text ? `?${text}` : '';
};

export const fetchGroups = (from, to) => request(`/api/groups${rangeQuery(null, from, to)}`);

export const fetchGroup = (groupId, game, from, to) =>
  request(`/api/groups/${groupId}${rangeQuery(game, from, to)}`);

export const fetchGroupDay = (groupId, game, offset) => {
  const params = new URLSearchParams();
  params.set('game', game);
  params.set('offset', String(offset));
  return request(`/api/groups/${groupId}/days?${params.toString()}`);
};

export const charterGroup = (body) =>
  request('/api/groups', { method: 'POST', body: JSON.stringify(body) });

export const updateGroupGames = (groupId, games) =>
  request(`/api/groups/${groupId}/games`, {
    method: 'PATCH',
    body: JSON.stringify({ games }),
  });

export const updateGroupAlerts = (groupId, body) =>
  request(`/api/groups/${groupId}/alerts`, { method: 'PATCH', body: JSON.stringify(body) });

export const renameGroup = (groupId, name) =>
  request(`/api/groups/${groupId}`, { method: 'PATCH', body: JSON.stringify({ name }) });

export const archiveGroup = (groupId) =>
  request(`/api/groups/${groupId}/archive`, { method: 'POST', body: JSON.stringify({}) });

export const unarchiveGroup = (groupId) =>
  request(`/api/groups/${groupId}/unarchive`, { method: 'POST', body: JSON.stringify({}) });

export const fetchArchivedGroups = () => request('/api/groups/archived');

export const leaveGroup = (groupId) =>
  request(`/api/groups/${groupId}/leave`, { method: 'POST', body: JSON.stringify({}) });

export const addGroupMember = (groupId, handle) =>
  request(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ handle }),
  });

export const joinGroup = (token) =>
  request(`/api/groups/join/${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
