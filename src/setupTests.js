import { cacheClear } from './utils/sessionCache';
import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn(() => false),
    getPlatform: jest.fn(() => 'web'),
  },
}));

jest.mock('@capacitor/browser', () => ({
  Browser: {
    open: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@capacitor/app', () => ({
  App: {
    getLaunchUrl: jest.fn(() => Promise.resolve(undefined)),
    addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  },
}));

jest.mock('@capacitor/keyboard', () => ({
  Keyboard: {
    setResizeMode: jest.fn(() => Promise.resolve()),
    setScroll: jest.fn(() => Promise.resolve()),
    addListener: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  },
  KeyboardResize: { None: 'none' },
}));

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => ({
    emit: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
  })),
}));

afterEach(() => {
  cacheClear();
});
