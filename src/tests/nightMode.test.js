import fs from 'fs';
import path from 'path';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { applyNightMode } from '../utils/nightMode';

jest.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: jest.fn(() => Promise.resolve()),
    setBackgroundColor: jest.fn(() => Promise.resolve()),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT' },
}));

describe('night mode', () => {
  beforeEach(() => {
    document.head.innerHTML = `
      <meta name="theme-color" content="#FBF9F5" />
      <meta name="color-scheme" content="light" />
    `;
    document.documentElement.classList.remove('night');
    document.documentElement.style.backgroundColor = '';
    document.body.style.backgroundColor = '';
    Capacitor.isNativePlatform.mockReturnValue(false);
    StatusBar.setStyle.mockClear();
    StatusBar.setBackgroundColor.mockClear();
  });

  test('paints the ink edition and restores the paper edition', async () => {
    await applyNightMode(true);
    expect(document.documentElement).toHaveClass('night');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#111111');
    expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');
    expect(document.body.style.backgroundColor).toBe('rgb(17, 17, 17)');

    await applyNightMode(false);
    expect(document.documentElement).not.toHaveClass('night');
    expect(document.querySelector('meta[name="theme-color"]')).toHaveAttribute('content', '#FBF9F5');
    expect(document.querySelector('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
    expect(document.body.style.backgroundColor).toBe('rgb(251, 249, 245)');
    expect(StatusBar.setStyle).not.toHaveBeenCalled();
  });

  test('sets the native status bar for the ink edition', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    await applyNightMode(true);
    expect(StatusBar.setStyle).toHaveBeenCalledWith({ style: Style.Dark });
    expect(StatusBar.setBackgroundColor).toHaveBeenCalledWith({ color: '#111111' });
  });

  test('the first paint reads the saved account', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
    expect(html).toContain("localStorage.getItem('ds:auth:user')");
    expect(html).toContain('night_mode');
    expect(html).toContain("classList.add('night')");
  });
});
