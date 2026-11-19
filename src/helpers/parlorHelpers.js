import { apiJson as request } from './sessionClient';

export const fetchConversations = () => request('/api/groups/conversations');

export const fetchParlor = (groupId, game, before) => {
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  if (before) params.set('before', String(before));
  const query = params.toString();
  return request(`/api/groups/${groupId}/parlor/messages${query ? `?${query}` : ''}`);
};

export const reactToMessage = (groupId, messageId, kind) =>
  request(`/api/groups/${groupId}/parlor/messages/${messageId}/reactions`, {
    method: 'POST',
    body: JSON.stringify({ kind }),
  });

export const markParlorRead = (groupId, game) =>
  request(`/api/groups/${groupId}/parlor/read`, {
    method: 'POST',
    body: JSON.stringify({ game }),
  });

export const postParlorMessage = (groupId, game, body) =>
  request(`/api/groups/${groupId}/parlor/messages`, {
    method: 'POST',
    body: JSON.stringify({ body, game }),
  });
