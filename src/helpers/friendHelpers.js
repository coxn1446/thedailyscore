import { apiJson as request } from './sessionClient';

export const fetchFriends = () => request('/api/friends');

export const searchFriends = (handle) =>
  request(`/api/friends/search?q=${encodeURIComponent(handle)}`);

export const requestFriend = (handle) =>
  request('/api/friends', { method: 'POST', body: JSON.stringify({ handle }) });

export const acceptFriend = (friendshipId) =>
  request(`/api/friends/${friendshipId}/accept`, { method: 'POST' });

export const declineFriend = (friendshipId) =>
  request(`/api/friends/${friendshipId}/decline`, { method: 'POST' });

export const removeFriend = (friendshipId) =>
  request(`/api/friends/${friendshipId}`, { method: 'DELETE' });

export const FRIENDS_EVENT = 'ds:friends';

export const notifyFriendsChanged = () => {
  window.dispatchEvent(new Event(FRIENDS_EVENT));
};
