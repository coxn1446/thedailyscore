import React from 'react';
import { useKeyboardInputClearance } from '../../hooks/useKeyboardInputClearance';

export function KeyboardSpacer({ focused, heightPx }) {
  return (
    <div
      aria-hidden
      data-testid="keyboard-spacer"
      className={['shrink-0', focused ? 'transition duration-300' : ''].filter(Boolean).join(' ')}
      style={{ height: focused ? heightPx : 0 }}
    />
  );
}

export function KeyboardClearance({ children, className = '' }) {
  const {
    enabled,
    headingRef,
    keyboardFieldFocused,
    keyboardClearancePx,
    onPointerDown,
    onFocusIn,
    onFocusOut,
  } = useKeyboardInputClearance();

  return (
    <div
      className={className}
      onPointerDown={onPointerDown}
      onFocus={onFocusIn}
      onBlur={onFocusOut}
    >
      <span ref={headingRef} tabIndex={-1} className="sr-only">
        Form
      </span>
      {children}
      {enabled ? (
        <KeyboardSpacer focused={keyboardFieldFocused} heightPx={keyboardClearancePx} />
      ) : null}
    </div>
  );
}
