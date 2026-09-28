/**
 * Google Cloud Storage stub.
 */
let storage = null;

const getStorage = () => {
  if (storage) return storage;
  try {
    const { Storage } = require('@google-cloud/storage');
    storage = new Storage();
    return storage;
  } catch (err) {
    console.warn('GCS init failed:', err.message);
    return null;
  }
};

const getBucketName = () =>
  process.env.GOOGLE_CLOUD_STORAGE_BUCKET || process.env.QA_GOOGLE_CLOUD_STORAGE_BUCKET || null;

module.exports = { getStorage, getBucketName };
