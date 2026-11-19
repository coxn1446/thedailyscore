import { apiJson } from './sessionClient';

export const fileGameRequest = async ({ gameName, note }) => apiJson('/api/game-requests', {
  method: 'POST',
  body: JSON.stringify({
    game_name: gameName,
    note,
  }),
});
