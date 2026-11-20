import { apiJson } from './sessionClient';

export const reportBug = (message, detail) =>
  apiJson('/api/bugs', {
    method: 'POST',
    body: JSON.stringify({ message, detail }),
  });
