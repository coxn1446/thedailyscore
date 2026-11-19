import { composerBottom } from '../utils/keyboardInputClearance';

describe('composer clearance', () => {
  test('keeps the composer bottom above the keyboard inside a shorter panel', () => {
    const form = {
      offsetParent: {
        getBoundingClientRect: () => ({ top: 80, bottom: 700, height: 620 }),
      },
    };
    const previous = window.innerHeight;
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    expect(composerBottom(form, 360)).toBe(260);
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: previous });
  });
});
