import { clientTimezone } from './identity';
import { apiJson as request } from './sessionClient';

export const fetchBoard = ({ game, scope, from, to, tz } = {}) => {
  const params = new URLSearchParams();
  if (game) params.set('game', game);
  if (scope === 'friends') params.set('scope', 'friends');
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  params.set('tz', tz || clientTimezone());
  const text = params.toString();
  return request(`/api/board${text ? `?${text}` : ''}`);
};
