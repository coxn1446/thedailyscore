import { apiJson } from './sessionClient';

const request = (url, options = {}) => apiJson(url, options);

export const fetchGameRequests = () => request('/api/admin/requests');

export const fetchBugReports = () => request('/api/admin/bugs');

export const fetchUnseenRequests = () => request('/api/admin/requests/unseen');

export const markRequestsSeen = () =>
  request('/api/admin/requests/seen', { method: 'POST' });

export const ADMIN_EVENT = 'ds:admin';

export const notifyAdminSeen = () => {
  window.dispatchEvent(new Event(ADMIN_EVENT));
};
