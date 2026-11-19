import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/auth.reducer';
import { ensurePushRegistration } from '../../helpers/pushRegistration';

const PushWatcher = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id || !Capacitor.isNativePlatform()) return undefined;
    let removeState;
    let cancelled = false;

    ensurePushRegistration({ request: true }).catch(() => {});

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appStateChange', ({ isActive }) => {
          if (cancelled || !isActive) return;
          ensurePushRegistration({ request: false }).catch(() => {});
        });
        removeState = handle;
      } catch {
        /* app plugin optional on web */
      }
    })();

    return () => {
      cancelled = true;
      removeState?.remove?.();
    };
  }, [isAuthenticated, user?.user_id]);

  return null;
};

export default PushWatcher;
