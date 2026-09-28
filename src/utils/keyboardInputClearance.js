export const FALLBACK_KEYBOARD_CLEARANCE_PX = 320;
export const SCROLL_CONTAINER_TOP_OFFSET_PX = 16;
export const KEYBOARD_SLIDE_ENTRY_FOCUS_GUARD_MS = 100;
export const MOBILE_KEYBOARD_MEDIA_QUERY = '(max-width: 767px)';

export function isKeyboardField(target) {
  return target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
}

export function measureKeyboardClearance() {
  if (typeof window === 'undefined') return 0;
  const viewport = window.visualViewport;
  if (!viewport) return 0;
  return Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
}

export function findScrollContainer(element) {
  let node = element?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
    node = node.parentElement;
  }
  return null;
}

export function getScrollBehavior() {
  if (!window.matchMedia) return 'smooth';
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

export function scrollInputToTopOfScrollContainer(input, offsetPx = SCROLL_CONTAINER_TOP_OFFSET_PX) {
  if (!(input instanceof HTMLElement)) return;
  const behavior = getScrollBehavior();
  const container = findScrollContainer(input);
  if (!container) {
    input.scrollIntoView?.({ block: 'start', behavior });
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const inputRect = input.getBoundingClientRect();
  const targetScrollTop = container.scrollTop + inputRect.top - containerRect.top - offsetPx;
  container.scrollTo({ top: Math.max(0, targetScrollTop), behavior });
}

export function isMobileKeyboardViewport(matchMediaImpl = typeof window !== 'undefined' ? window.matchMedia : null) {
  if (!matchMediaImpl) return false;
  return Boolean(matchMediaImpl(MOBILE_KEYBOARD_MEDIA_QUERY)?.matches);
}

export function keepKeyboardForPointerSelect(event) {
  if (!event) return false;
  if (typeof event.button === 'number' && event.button !== 0) return false;
  event.preventDefault();
  return true;
}
