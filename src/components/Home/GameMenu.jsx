import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import GameLogo from '../Brand/GameLogo';
import { PlusMark } from '../Brand/Marks';

const linkClass =
  'inline-flex items-center gap-space-sm whitespace-nowrap font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';

const GameMenu = ({ games, onOpen }) => {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const button = buttonRef.current;
      const menu = menuRef.current;
      if (!button || !menu) return;
      const rect = button.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${rect.left}px`;
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  return (
    <div>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Games"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center border border-primary p-space-xs text-primary hover:bg-primary hover:text-on-primary"
      >
        <PlusMark />
      </button>
      {open ? createPortal(
        <nav
          ref={menuRef}
          aria-label="Games"
          className="fixed z-50 flex w-max flex-col gap-space-sm border border-primary bg-background p-space-md"
        >
          {games.map((game) => (
            <a
              key={game.slug}
              href={game.href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                setOpen(false);
                onOpen(event);
              }}
              className={linkClass}
            >
              <GameLogo slug={game.slug} />
              {game.name}
            </a>
          ))}
        </nav>,
        document.body
      ) : null}
    </div>
  );
};

export default GameMenu;
