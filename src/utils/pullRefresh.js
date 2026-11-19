export const PULL_REFRESH_DISTANCE = 64;

export const pullOffset = (startY, currentY, scrollTop) => {
  if (startY == null || currentY == null || scrollTop > 0) return 0;
  const delta = currentY - startY;
  if (delta <= 0) return 0;
  return Math.min(Math.round(delta * 0.55), 88);
};

export const bindPullRefresh = (node, { enabled, onOffset, onRefresh }) => {
  if (!node || !enabled) return () => {};

  let startY = null;
  let offset = 0;
  let busy = false;

  const settle = (commit) => {
    const shouldRefresh = commit && offset >= PULL_REFRESH_DISTANCE && !busy;
    startY = null;
    offset = 0;
    onOffset(0);
    if (!shouldRefresh) return;
    busy = true;
    Promise.resolve(onRefresh()).finally(() => {
      busy = false;
    });
  };

  const onStart = (event) => {
    if (busy || node.scrollTop > 0) {
      startY = null;
      return;
    }
    startY = event.touches?.[0]?.clientY ?? null;
    offset = 0;
  };

  const onMove = (event) => {
    if (startY == null) return;
    offset = pullOffset(startY, event.touches?.[0]?.clientY, node.scrollTop);
    onOffset(offset);
    if (offset > 0 && event.cancelable) event.preventDefault();
  };

  const onEnd = () => settle(true);
  const onCancel = () => settle(false);

  node.addEventListener('touchstart', onStart, { passive: true });
  node.addEventListener('touchmove', onMove, { passive: false });
  node.addEventListener('touchend', onEnd);
  node.addEventListener('touchcancel', onCancel);

  return () => {
    node.removeEventListener('touchstart', onStart);
    node.removeEventListener('touchmove', onMove);
    node.removeEventListener('touchend', onEnd);
    node.removeEventListener('touchcancel', onCancel);
  };
};
