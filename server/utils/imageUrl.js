const IMAGE_URL = /^(?:\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,180}|https:\/\/storage\.googleapis\.com\/[a-z0-9][a-z0-9._-]{1,200}\/uploads\/[A-Za-z0-9][A-Za-z0-9._-]{0,180})$/i;

const invalid = () => {
  const err = new Error('Picture is not valid');
  err.status = 400;
  return err;
};

// Null clears the picture. Any other value must be a file this app stored.
const normalizeImageUrl = (value) => {
  if (value == null) return null;
  if (typeof value !== 'string') throw invalid();
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('..') || !IMAGE_URL.test(trimmed)) throw invalid();
  return trimmed;
};

module.exports = {
  normalizeImageUrl,
};
