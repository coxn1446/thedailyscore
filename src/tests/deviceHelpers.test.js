import { noteRegistration, registerDevice, currentDeviceToken } from '../helpers/deviceHelpers';

describe('deviceHelpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('keeps the APNs token and the FCM token as they arrive', () => {
    const apns = noteRegistration({}, '5FEB56BB');
    expect(apns).toEqual({ token: '5FEB56BB', fcmToken: '' });
    const both = noteRegistration(apns, 'FCM:firebase-token');
    expect(both).toEqual({ token: '5FEB56BB', fcmToken: 'firebase-token' });
    expect(noteRegistration(both, 'FCM:')).toEqual({ token: '5FEB56BB', fcmToken: '' });
  });

  test('posts both tokens and remembers the APNs token for sign-out', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ token: 'apns-1', fcm_token: 'fcm-1', platform: 'ios' }),
    });

    await expect(registerDevice('apns-1', '', 'ios')).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();

    const saved = await registerDevice('apns-1', 'fcm-1', 'ios');
    expect(saved.fcm_token).toBe('fcm-1');
    expect(global.fetch).toHaveBeenCalledWith('/api/devices', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ token: 'apns-1', fcm_token: 'fcm-1', platform: 'ios' }),
    }));
    expect(currentDeviceToken()).toBe('apns-1');
  });
});