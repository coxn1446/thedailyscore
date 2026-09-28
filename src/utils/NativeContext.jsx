import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';

const NativeContext = createContext({
  isNative: false,
  platform: 'web',
  keyboardVisible: false,
});

const applyStatusBar = async () => {
  const { StatusBar, Style } = await import('@capacitor/status-bar');
  await StatusBar.setStyle({ style: Style.Light });
  await StatusBar.setBackgroundColor({ color: '#FBF9F5' });
};

export const NativeProvider = ({ children }) => {
  const [value, setValue] = useState({
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
    keyboardVisible: false,
  });

  useEffect(() => {
    let cancelled = false;
    let keyboardListeners = [];

    async function init() {
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      if (!isNative) {
        if (!cancelled) setValue({ isNative: false, platform: 'web', keyboardVisible: false });
        return;
      }

      try {
        const { Keyboard, KeyboardResize } = await import('@capacitor/keyboard');
        if (platform === 'ios') {
          try {
            await Keyboard.setResizeMode({ mode: KeyboardResize.None });
          } catch {
            /* plugin or platform mismatch */
          }
          try {
            await Keyboard.setScroll({ isDisabled: true });
          } catch {
            /* plugin or platform mismatch */
          }
        }
        keyboardListeners = await Promise.all([
          Keyboard.addListener('keyboardWillShow', () => {
            setValue((prev) => ({ ...prev, keyboardVisible: true }));
          }),
          Keyboard.addListener('keyboardWillHide', () => {
            setValue((prev) => ({ ...prev, keyboardVisible: false }));
          }),
        ]);
      } catch {
        /* keyboard plugin optional in tests */
      }

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {
        /* splash screen plugin may be unavailable */
      }

      try {
        await applyStatusBar();
      } catch {
        /* status bar optional on web */
      }

      if (!cancelled) {
        setValue((prev) => ({ ...prev, isNative: true, platform }));
      }
    }

    init();

    return () => {
      cancelled = true;
      keyboardListeners.forEach((listener) => listener && listener.remove && listener.remove());
    };
  }, []);

  return <NativeContext.Provider value={value}>{children}</NativeContext.Provider>;
};

export const useNative = () => useContext(NativeContext);
