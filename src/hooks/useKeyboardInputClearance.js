import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNative } from '../utils/NativeContext';
import {
  FALLBACK_KEYBOARD_CLEARANCE_PX,
  KEYBOARD_SLIDE_ENTRY_FOCUS_GUARD_MS,
  isKeyboardField,
  isMobileKeyboardViewport,
  measureKeyboardClearance,
  MOBILE_KEYBOARD_MEDIA_QUERY,
  scrollInputToTopOfScrollContainer,
} from '../utils/keyboardInputClearance';

export function useKeyboardInputClearance({ enabled: enabledOverride, scrollFocusedField = true } = {}) {
  const { isNative } = useNative();
  const [viewportEnabled, setViewportEnabled] = useState(
    () => isNative || isMobileKeyboardViewport()
  );
  const enabled = enabledOverride ?? viewportEnabled;
  const [keyboardFieldFocused, setKeyboardFieldFocused] = useState(false);
  const [keyboardClearancePx, setKeyboardClearancePx] = useState(0);
  const keyboardFocusedInputRef = useRef(null);
  const headingRef = useRef(null);
  const enteredAtRef = useRef(0);
  const userIntentRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const media = window.matchMedia(MOBILE_KEYBOARD_MEDIA_QUERY);
    const update = () => setViewportEnabled(isNative || media.matches);
    update();
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    media.addListener(update);
    return () => media.removeListener(update);
  }, [isNative]);

  const clearFocus = useCallback(() => {
    setKeyboardFieldFocused(false);
    setKeyboardClearancePx(0);
    keyboardFocusedInputRef.current = null;
  }, []);

  useLayoutEffect(() => {
    if (!enabled) {
      clearFocus();
      return undefined;
    }
    enteredAtRef.current = Date.now();
    userIntentRef.current = false;
    clearFocus();
    const active = document.activeElement;
    if (isKeyboardField(active)) {
      active.blur();
    }
    headingRef.current?.focus?.({ preventScroll: true });
    return undefined;
  }, [clearFocus, enabled]);

  const onPointerDown = useCallback((event) => {
    if (isKeyboardField(event.target)) userIntentRef.current = true;
  }, []);

  const onFocusIn = useCallback(
    (event) => {
      if (!enabled) return;
      const target = event.target;
      if (!isKeyboardField(target)) return;

      const recentlyEntered = Date.now() - enteredAtRef.current < KEYBOARD_SLIDE_ENTRY_FOCUS_GUARD_MS;
      if (recentlyEntered && !userIntentRef.current) {
        target.blur();
        headingRef.current?.focus?.({ preventScroll: true });
        return;
      }

      userIntentRef.current = false;
      setKeyboardFieldFocused(true);
      const measured = measureKeyboardClearance();
      setKeyboardClearancePx(measured > 0 ? measured : FALLBACK_KEYBOARD_CLEARANCE_PX);
      keyboardFocusedInputRef.current = target;
    },
    [enabled]
  );

  const onFocusOut = useCallback((event) => {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearFocus();
  }, [clearFocus]);

  useEffect(() => {
    if (!scrollFocusedField || !keyboardFieldFocused || !keyboardFocusedInputRef.current) return undefined;
    const input = keyboardFocusedInputRef.current;
    let frameTwo;
    const frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        scrollInputToTopOfScrollContainer(input);
      });
    });
    return () => {
      cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
    };
  }, [keyboardFieldFocused, keyboardClearancePx, scrollFocusedField]);

  useEffect(() => {
    if (!keyboardFieldFocused || !enabled) return undefined;

    const sync = () => {
      const measured = measureKeyboardClearance();
      if (measured > 0) setKeyboardClearancePx(measured);
    };

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', sync);
    viewport?.addEventListener('scroll', sync);

    let showHandle;
    let didShowHandle;
    if (Capacitor.isNativePlatform()) {
      import('@capacitor/keyboard')
        .then(({ Keyboard }) =>
          Promise.all([
            Keyboard.addListener('keyboardWillShow', (info) => {
              if (info?.keyboardHeight) setKeyboardClearancePx(info.keyboardHeight);
            }),
            Keyboard.addListener('keyboardDidShow', (info) => {
              if (info?.keyboardHeight) setKeyboardClearancePx(info.keyboardHeight);
            }),
          ])
        )
        .then((handles) => {
          [showHandle, didShowHandle] = handles;
        })
        .catch(() => {});
    }

    return () => {
      viewport?.removeEventListener('resize', sync);
      viewport?.removeEventListener('scroll', sync);
      showHandle?.remove?.();
      didShowHandle?.remove?.();
    };
  }, [enabled, keyboardFieldFocused]);

  return {
    enabled,
    headingRef,
    keyboardFieldFocused,
    keyboardClearancePx,
    onPointerDown,
    onFocusIn,
    onFocusOut,
  };
}
