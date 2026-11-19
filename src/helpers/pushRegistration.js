import { Capacitor } from '@capacitor/core';
import { noteRegistration, registerDevice } from './deviceHelpers';

let listening = false;
let pending = { token: '', fcmToken: '' };

const canAsk = (status) => status === 'prompt' || status === 'prompt-with-rationale';

export const ensurePushRegistration = async ({ request = false } = {}) => {
  if (!Capacitor.isNativePlatform()) return 'unavailable';
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let perm = await PushNotifications.checkPermissions();
    if (request && canAsk(perm.receive)) {
      perm = await PushNotifications.requestPermissions();
    }
    if (perm.receive !== 'granted') return perm.receive === 'denied' ? 'denied' : 'prompt';
    if (!listening) {
      listening = true;
      await PushNotifications.addListener('registration', (token) => {
        const next = noteRegistration(pending, token?.value);
        pending = next;
        if (!next.token || !next.fcmToken) return;
        registerDevice(next.token, next.fcmToken, Capacitor.getPlatform()).catch(() => {});
      });
    }
    await PushNotifications.register();
    return 'granted';
  } catch {
    return 'unavailable';
  }
};
