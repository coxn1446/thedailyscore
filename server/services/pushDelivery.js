const { getFirebaseAdmin } = require('../config/firebase');

const STALE = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const deliver = async (tokens, message) => {
  const unique = [...new Set((tokens || []).filter((token) => typeof token === 'string' && token))];
  if (!unique.length) return { sent: 0, stale: [] };
  const admin = getFirebaseAdmin();
  if (!admin) return { sent: 0, stale: [] };
  const messaging = admin.messaging();
  let sent = 0;
  const stale = [];
  for (const token of unique) {
    try {
      await messaging.send({
        token,
        notification: {
          title: message.title,
          body: message.body,
        },
        data: message.data || {},
        apns: {
          payload: {
            aps: { sound: 'default' },
          },
        },
      });
      sent += 1;
    } catch (err) {
      if (STALE.has(err?.code)) stale.push(token);
    }
  }
  return { sent, stale };
};

module.exports = { deliver };
