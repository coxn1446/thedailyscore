import { Capacitor } from '@capacitor/core';

const DAY_PAPER = '#FBF9F5';
const NIGHT_PAPER = '#111111';

export const applyNightMode = async (enabled) => {
  const night = enabled === true;
  const root = document.documentElement;
  root.classList.toggle('night', night);
  const color = night ? NIGHT_PAPER : DAY_PAPER;
  const theme = document.querySelector('meta[name="theme-color"]');
  if (theme) theme.setAttribute('content', color);
  const scheme = document.querySelector('meta[name="color-scheme"]');
  if (scheme) scheme.setAttribute('content', night ? 'dark' : 'light');
  root.style.backgroundColor = color;
  if (document.body) document.body.style.backgroundColor = color;
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: night ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color });
  } catch {
    /* status bar optional outside the native shell */
  }
};
