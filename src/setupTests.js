import { cacheClear } from './utils/sessionCache';
import { resetSessionClientForTests } from './helpers/sessionClient';
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

jest.mock('@capacitor/core', () => {
  const share = jest.fn(() => Promise.resolve());
  return {
    Capacitor: {
      isNativePlatform: jest.fn(() => false),
      getPlatform: jest.fn(() => 'web'),
    },
    registerPlugin: jest.fn(() => ({ share })),
  };
});

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

class FetchBackedXHR {
  constructor() {
    this.upload = {};
    this.status = 0;
    this.responseText = '';
    this.withCredentials = false;
    this.onload = null;
    this.onerror = null;
  }

  open(method, url) {
    this.method = method;
    this.url = url;
  }

  send(body) {
    const run = async () => {
      this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
      try {
        const res = await global.fetch(this.url, {
          method: this.method,
          body,
          credentials: this.withCredentials ? 'include' : 'same-origin',
        });
        let text = '{}';
        if (res && typeof res.text === 'function') text = await res.text();
        else if (res && typeof res.json === 'function') text = JSON.stringify(await res.json());
        this.status = Number.isInteger(res?.status) ? res.status : (res?.ok === false ? 500 : 200);
        this.responseText = text;
        this.upload.onprogress?.({ lengthComputable: true, loaded: 100, total: 100 });
        this.onload?.();
      } catch {
        this.onerror?.();
      }
    };
    run();
  }
}

window.XMLHttpRequest = FetchBackedXHR;
global.XMLHttpRequest = FetchBackedXHR;

afterEach(() => {
  cacheClear();
  resetSessionClientForTests();
  document.documentElement.classList.remove('night');
  try {
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
});
