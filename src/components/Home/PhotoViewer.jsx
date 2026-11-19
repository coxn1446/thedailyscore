import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CloseMark } from '../Brand/Marks';

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const MOBILE_QUERY = '(max-width: 1023px), (pointer: coarse)';

const distance = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const midpoint = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

const PhotoViewer = ({ src, onClose }) => {
  const frameRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const frame = frameRef.current;
    const media = window.matchMedia(MOBILE_QUERY);
    if (!frame || !media.matches) return undefined;

    const img = frame.querySelector('img');
    const view = { scale: MIN_SCALE, x: 0, y: 0 };
    let pinch = null;
    let pan = null;

    const paint = () => {
      img.style.setProperty('--photo-scale', String(view.scale));
      img.style.setProperty('--photo-x', `${view.x}px`);
      img.style.setProperty('--photo-y', `${view.y}px`);
    };

    const clampPan = (scale, x, y) => {
      const rect = frame.getBoundingClientRect();
      const maxX = Math.max(0, (img.offsetWidth * scale - rect.width) / 2);
      const maxY = Math.max(0, (img.offsetHeight * scale - rect.height) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    };

    const onTouchStart = (event) => {
      if (event.touches.length === 2) {
        pan = null;
        const [a, b] = event.touches;
        const mid = midpoint(a, b);
        pinch = {
          dist: distance(a, b),
          scale: view.scale,
          x: view.x,
          y: view.y,
          midX: mid.x,
          midY: mid.y,
        };
        return;
      }
      if (event.touches.length === 1 && view.scale > MIN_SCALE) {
        pinch = null;
        pan = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          tx: view.x,
          ty: view.y,
        };
      }
    };

    const onTouchMove = (event) => {
      if (pinch && event.touches.length === 2) {
        if (!pinch.dist) return;
        event.preventDefault();
        const [a, b] = event.touches;
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinch.scale * (distance(a, b) / pinch.dist)));
        const rect = frame.getBoundingClientRect();
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        const mid = midpoint(a, b);
        const ratio = scale / pinch.scale;
        const next = clampPan(
          scale,
          mid.x - originX - (pinch.midX - originX - pinch.x) * ratio,
          mid.y - originY - (pinch.midY - originY - pinch.y) * ratio,
        );
        view.scale = scale;
        view.x = next.x;
        view.y = next.y;
        paint();
        return;
      }
      if (pan && event.touches.length === 1) {
        event.preventDefault();
        const next = clampPan(
          view.scale,
          pan.tx + (event.touches[0].clientX - pan.x),
          pan.ty + (event.touches[0].clientY - pan.y),
        );
        view.x = next.x;
        view.y = next.y;
        paint();
      }
    };

    const onTouchEnd = (event) => {
      if (event.touches.length >= 2) return;
      pinch = null;
      pan = null;
      if (view.scale <= MIN_SCALE) {
        view.scale = MIN_SCALE;
        view.x = 0;
        view.y = 0;
        paint();
      }
    };

    frame.addEventListener('touchstart', onTouchStart, { passive: true });
    frame.addEventListener('touchmove', onTouchMove, { passive: false });
    frame.addEventListener('touchend', onTouchEnd);
    frame.addEventListener('touchcancel', onTouchEnd);
    return () => {
      frame.removeEventListener('touchstart', onTouchStart);
      frame.removeEventListener('touchmove', onTouchMove);
      frame.removeEventListener('touchend', onTouchEnd);
      frame.removeEventListener('touchcancel', onTouchEnd);
    };
  }, []);

  const dialog = (
    <div role="dialog" aria-modal="true" aria-label="Picture" className="fixed inset-0 z-50 bg-background">
      <div ref={frameRef} className="photo-stage flex h-full w-full items-center justify-center">
        <img src={src} alt="Picture" draggable={false} className="photo-zoom max-h-full max-w-full object-contain" />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 pt-safe-top pl-margin">
        <button ref={closeRef} type="button" aria-label="Close" onClick={onClose} className="pointer-events-auto bg-background p-space-sm text-primary">
          <CloseMark />
        </button>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default PhotoViewer;
