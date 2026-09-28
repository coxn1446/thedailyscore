/**
 * Firebase Admin stub. Wire credentials when push notifications are needed.
 */
let initialized = false;

const initFirebase = () => {
  if (initialized) return null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    console.warn('Firebase Admin not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing).');
    return null;
  }
  try {
    const admin = require('firebase-admin');
    const credentials = typeof raw === 'string' ? JSON.parse(raw) : raw;
    admin.initializeApp({
      credential: admin.credential.cert(credentials),
    });
    initialized = true;
    return admin;
  } catch (err) {
    console.warn('Firebase Admin init failed:', err.message);
    return null;
  }
};

const getFirebaseAdmin = () => (initialized ? require('firebase-admin') : initFirebase());

module.exports = { initFirebase, getFirebaseAdmin };
