const { getFirebaseAdmin } = require('../config/firebase');

const STALE = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

const deliver = async (tokens, message) => {
  const unique = [...new Set((tokens || []).filter((token) => typeof token === 'string' && token))];
  const type = message?.data?.type || 'push';
  if (!unique.length) {
    console.log('[push] delivery stop', { type, reason: 'no tokens' });
    return { sent: 0, stale: [] };
  }
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.warn('[push] delivery stop', { type, reason: 'firebase admin missing' });
    return { sent: 0, stale: [] };
  }
  const messaging = admin.messaging();
  let sent = 0;
  const stale = [];
  for (const token of unique) {
    try {
      const messageId = await messaging.send({
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
      console.log('[push] firebase accepted', { type, title: message.title, messageId });
    } catch (err) {
      const expired = STALE.has(err?.code);
      if (expired) stale.push(token);
      console.warn('[push] firebase rejected', {
        type,
        title: message.title,
        code: err?.code || 'unknown',
        message: err?.message || 'send failed',
        stale: expired,
      });
    }
  }
  return { sent, stale };
};

module.exports = { deliver };
