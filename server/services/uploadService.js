const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const { getStorage, getBucketName } = require('../config/storage');

const LOCAL_UPLOAD_DIR = path.join(process.cwd(), 'uploads');

const ensureLocalDir = () => {
  if (!fs.existsSync(LOCAL_UPLOAD_DIR)) {
    fs.mkdirSync(LOCAL_UPLOAD_DIR, { recursive: true });
  }
};

const uploadBuffer = async (file) => {
  if (!file?.buffer) {
    const err = new Error('File is required');
    err.status = 400;
    throw err;
  }

  const ext = path.extname(file.originalname || '') || '';
  const objectName = `uploads/${randomUUID()}${ext}`;
  const bucketName = getBucketName();
  const storage = getStorage();

  let mediaUrl;
  if (bucketName && storage) {
    const bucket = storage.bucket(bucketName);
    const gcsFile = bucket.file(objectName);
    await gcsFile.save(file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    mediaUrl = `https://storage.googleapis.com/${bucketName}/${objectName}`;
  } else {
    ensureLocalDir();
    const localName = path.basename(objectName);
    fs.writeFileSync(path.join(LOCAL_UPLOAD_DIR, localName), file.buffer);
    mediaUrl = `/uploads/${localName}`;
  }

  return {
    media_url: mediaUrl,
    filename: file.originalname || null,
    mimetype: file.mimetype || null,
  };
};

module.exports = {
  uploadBuffer,
};
