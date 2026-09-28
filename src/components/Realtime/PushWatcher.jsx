import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/auth.reducer';
import { registerDevice } from '../../helpers/deviceHelpers';

const PushWatcher = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id || !Capacitor.isNativePlatform()) return undefined;
    let removeRegistration;
    let cancelled = false;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted' || cancelled) return;
        const handle = await PushNotifications.addListener('registration', (token) => {
          const value = token?.value;
          if (!value || cancelled) return;
          registerDevice(value, Capacitor.getPlatform()).catch(() => {});
        });
        removeRegistration = handle;
        await PushNotifications.register();
      } catch {
        /* push plugin optional on web */
      }
    })();

    return () => {
      cancelled = true;
      removeRegistration?.remove?.();
    };
  }, [isAuthenticated, user?.user_id]);

  return null;
};

export default PushWatcher;
