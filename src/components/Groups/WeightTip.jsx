import React, { useRef, useState } from 'react';

const TIP_WIDTH = 256;

const roomFor = (button) => {
  const rect = button.getBoundingClientRect();
  let clipLeft = 0;
  let clipRight = window.innerWidth;
  let node = button.parentElement;
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node);
    const overflow = `${style.overflow} ${style.overflowX}`;
    if (overflow.includes('hidden') || overflow.includes('auto') || overflow.includes('scroll')) {
      const box = node.getBoundingClientRect();
      clipLeft = Math.max(clipLeft, box.left);
      clipRight = Math.min(clipRight, box.right);
    }
    node = node.parentElement;
  }
  return {
    right: clipRight - rect.left,
    left: rect.right - clipLeft,
  };
};

const WeightTip = ({ text, label = 'How this average is calculated' }) => {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState('end');
  const fromMouse = useRef(false);
  const buttonRef = useRef(null);

  const place = () => {
    const button = buttonRef.current;
    if (!button) return;
    const room = roomFor(button);
    const opensRight = room.right >= TIP_WIDTH || room.right >= room.left;
    setSide(opensRight ? 'start' : 'end');
  };

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'mouse') return;
        fromMouse.current = true;
        place();
        setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType !== 'mouse') return;
        fromMouse.current = false;
        setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          if (fromMouse.current) return;
          place();
          setOpen((value) => !value);
        }}
        onBlur={() => setOpen(false)}
        className="inline-flex h-4 w-4 items-center justify-center border border-border font-sans text-caption normal-case tracking-normal text-muted hover:border-primary hover:text-primary"
      >
        ?
      </button>
      {open ? (
        <span
          role="tooltip"
          className={`absolute top-full z-10 mt-space-xs w-64 border border-primary bg-background p-space-sm text-left font-sans text-caption normal-case tracking-normal text-primary ${side === 'start' ? 'left-0' : 'right-0'}`}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
};

export default WeightTip;
