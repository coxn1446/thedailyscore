const readJson = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
};

export const fileGameRequest = async ({ gameName, note }) => {
  const res = await fetch('/api/game-requests', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      game_name: gameName,
      note,
    }),
  });
  return readJson(res);
};
