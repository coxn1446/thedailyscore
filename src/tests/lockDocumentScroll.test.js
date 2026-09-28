import { lockDocumentScroll } from '../utils/lockDocumentScroll';

describe('lockDocumentScroll', () => {
  const originalMatchMedia = window.matchMedia;
  const originalGetComputedStyle = window.getComputedStyle;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    window.getComputedStyle = originalGetComputedStyle;
  });

  test('blocks a touch move that is not inside a scroller on a phone', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    const release = lockDocumentScroll();
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(move, 'touches', { value: [{ clientY: 40 }] });
    document.body.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(true);
    release();
  });

  test('lets a touch move scroll a list that is not at its edge', () => {
    window.matchMedia = jest.fn(() => ({ matches: true }));
    const scroller = document.createElement('div');
    Object.defineProperty(scroller, 'scrollHeight', { value: 400 });
    Object.defineProperty(scroller, 'clientHeight', { value: 100 });
    scroller.scrollTop = 20;
    scroller.style.overflowY = 'auto';
    document.body.appendChild(scroller);
    window.getComputedStyle = jest.fn(() => ({ overflowY: 'auto' }));
    const release = lockDocumentScroll();
    const start = new Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientY: 80 }] });
    scroller.dispatchEvent(start);
    const move = new Event('touchmove', { bubbles: true, cancelable: true });
    Object.defineProperty(move, 'touches', { value: [{ clientY: 40 }] });
    scroller.dispatchEvent(move);
    expect(move.defaultPrevented).toBe(false);
    release();
    scroller.remove();
  });
});
