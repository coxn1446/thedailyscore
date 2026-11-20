import { apiJson } from './sessionClient';

const request = (url, options = {}) => apiJson(url, options);

export const NOTIFICATIONS_EVENT = 'ds:notifications';

export const fetchNotifications = () => request('/api/notifications');

export const fetchUnreadNotifications = () => request('/api/notifications/unseen');

export const markNotificationsRead = () => request('/api/notifications/seen', { method: 'POST' });

export const notifyNotificationsChanged = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_EVENT));
};
