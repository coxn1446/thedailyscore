const scrollableY = (node) => {
  let current = node instanceof Element ? node : null;
  while (current && current !== document.body) {
    const { overflowY } = window.getComputedStyle(current);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
      && current.scrollHeight > current.clientHeight + 1
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
};

export const lockDocumentScroll = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  const media = window.matchMedia('(max-width: 1023px)');
  let lastY = 0;

  const onStart = (event) => {
    lastY = event.touches?.[0]?.clientY ?? 0;
  };

  const onMove = (event) => {
    if (!media.matches || event.touches.length !== 1) return;
    const scroller = scrollableY(event.target);
    const y = event.touches[0].clientY;
    const dy = y - lastY;
    lastY = y;
    if (!scroller) {
      event.preventDefault();
      return;
    }
    const atTop = scroller.scrollTop <= 0;
    const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1;
    if ((atTop && dy > 0) || (atBottom && dy < 0)) event.preventDefault();
  };

  document.addEventListener('touchstart', onStart, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: false });
  return () => {
    document.removeEventListener('touchstart', onStart);
    document.removeEventListener('touchmove', onMove);
  };
};
