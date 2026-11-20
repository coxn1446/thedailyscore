import { apiJson, apiUpload } from './sessionClient';

const request = (url, options = {}) => apiJson(url, options);

export const fetchFeed = () => request('/api/feed');

export const saveFeedScope = (scope) =>
  request('/api/profile', { method: 'PATCH', body: JSON.stringify({ feed_scope: scope }) });

export const fetchPost = (scoreId) => request(`/api/feed/${scoreId}`);

export const likeScore = (scoreId) => request(`/api/feed/${scoreId}/like`, { method: 'POST' });

export const unlikeScore = (scoreId) => request(`/api/feed/${scoreId}/like`, { method: 'DELETE' });

export const fetchComments = (scoreId) => request(`/api/feed/${scoreId}/comments`);

export const postComment = (scoreId, body, imageUrl) =>
  request(`/api/feed/${scoreId}/comments`, {
    method: 'POST',
    body: JSON.stringify(imageUrl ? { body, image_url: imageUrl } : { body }),
  });

export const deleteComment = (commentId) => request(`/api/feed/comments/${commentId}`, { method: 'DELETE' });

export const setScorePicture = (scoreId, imageUrl) =>
  request(`/api/feed/${scoreId}/image`, {
    method: 'PATCH',
    body: JSON.stringify({ image_url: imageUrl }),
  });

export const uploadPicture = async (file, onProgress) => {
  const body = new FormData();
  body.append('file', file);
  const result = await apiUpload('/api/uploads', body, onProgress);
  if (!result?.ok) throw new Error(result?.data?.error || 'Could not upload picture');
  return result.data?.media?.media_url || '';
};
