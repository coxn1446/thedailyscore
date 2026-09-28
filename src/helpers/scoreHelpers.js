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

export const previewScore = (paste) =>
  request('/api/scores/preview', { method: 'POST', body: JSON.stringify({ paste }) });

export const postScore = (paste, groups) =>
  request('/api/scores', {
    method: 'POST',
    body: JSON.stringify(groups === undefined ? { paste } : { paste, groups }),
  });

export const fetchBests = () => request('/api/scores/bests');

export const fetchGazette = () => request('/api/scores/gazette');

export const fetchLoggedToday = () => request('/api/scores/logged-today');

export const fetchArchive = () => request('/api/scores/archive');

export const deleteScore = (scoreId) => request(`/api/scores/${scoreId}`, { method: 'DELETE' });

export const updateScoreGroups = (scoreId, groups) =>
  request(`/api/scores/${scoreId}/groups`, {
    method: 'PATCH',
    body: JSON.stringify({ groups }),
  });

export const formatResult = (result) => {
  if (result?.game?.rank_basis === 'guesses') {
    if (!result.solved || result.guesses == null) return 'X/6';
    return `${result.guesses}/6`;
  }
  return String(result?.score ?? '');
};
