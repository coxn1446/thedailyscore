import { bindPullRefresh, pullOffset } from '../utils/pullRefresh';

const touch = (node, type, clientY) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'touches', { value: clientY == null ? [] : [{ clientY }] });
  node.dispatchEvent(event);
};

describe('pull refresh', () => {
  test('measures a downward pull from the top', () => {
    expect(pullOffset(10, 10, 0)).toBe(0);
    expect(pullOffset(10, 4, 0)).toBe(0);
    expect(pullOffset(0, 40, 12)).toBe(0);
    expect(pullOffset(0, 40, 0)).toBe(22);
    expect(pullOffset(0, 400, 0)).toBe(88);
  });

  test('refreshes once a pull passes the threshold and ignores a second pull until it finishes', async () => {
    const node = document.createElement('div');
    let top = 0;
    Object.defineProperty(node, 'scrollTop', {
      configurable: true,
      get: () => top,
      set: (value) => {
        top = value;
      },
    });
    const offsets = [];
    let refreshes = 0;
    let release = () => {};
    const unbind = bindPullRefresh(node, {
      enabled: true,
      onOffset: (value) => offsets.push(value),
      onRefresh: () => new Promise((resolve) => {
        refreshes += 1;
        release = resolve;
      }),
    });

    touch(node, 'touchstart', 0);
    touch(node, 'touchmove', 20);
    touch(node, 'touchend');
    expect(refreshes).toBe(0);
    expect(offsets.at(-1)).toBe(0);

    touch(node, 'touchstart', 0);
    top = 20;
    touch(node, 'touchmove', 200);
    expect(offsets.at(-1)).toBe(0);
    touch(node, 'touchcancel');
    top = 0;

    touch(node, 'touchstart', 0);
    touch(node, 'touchmove', 200);
    expect(offsets.at(-1)).toBe(88);
    touch(node, 'touchend');
    expect(refreshes).toBe(1);

    touch(node, 'touchstart', 0);
    touch(node, 'touchmove', 200);
    touch(node, 'touchend');
    expect(refreshes).toBe(1);

    release();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    touch(node, 'touchstart', 0);
    touch(node, 'touchmove', 200);
    touch(node, 'touchend');
    expect(refreshes).toBe(2);
    unbind();
    release();
  });

  test('stays idle when pull refresh is off', () => {
    const node = document.createElement('div');
    const refresh = jest.fn();
    const unbind = bindPullRefresh(node, { enabled: false, onOffset: jest.fn(), onRefresh: refresh });
    touch(node, 'touchstart', 0);
    touch(node, 'touchmove', 200);
    touch(node, 'touchend');
    expect(refresh).not.toHaveBeenCalled();
    unbind();
  });
});