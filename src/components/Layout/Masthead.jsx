import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/auth.reducer';
import { editionDateline } from '../../utils/edition';
import { GearMark } from '../Brand/Marks';
import GamePicker from '../Games/GamePicker';
import { DeskNav } from '../Nav/DeskNav';

const Masthead = () => {
  const user = useSelector(selectUser);
  const zone = user?.timezone;
  const [gamesOpen, setGamesOpen] = useState(false);

  return (
    <header data-testid="masthead" className="shrink-0 border-b border-border bg-background pt-safe-top">
      <div className="flex items-center justify-between gap-space-md bg-inset px-margin py-space-sm md:px-margin-desktop">
        <p className="font-mono text-caption uppercase text-muted">
          <span className="font-sans text-kicker tracking-kicker text-secondary">Edition</span>
          <span className="px-space-sm text-border-strong">|</span>
          <span>{editionDateline(zone)}</span>
        </p>
        <div className="flex items-center gap-space-md">
          <p className="hidden font-sans text-kicker uppercase tracking-kicker text-primary md:block">
            YOUR DAILY GAMES. ONE SCORE.
          </p>
          <button
            type="button"
            aria-label="Select Your Games"
            onClick={() => setGamesOpen(true)}
            className="p-space-xs text-primary lg:hidden"
          >
            <GearMark />
          </button>
        </div>
      </div>
      <div className="hidden px-margin py-space-sm md:px-margin-desktop lg:block">
        <DeskNav />
      </div>
      {gamesOpen ? <GamePicker onClose={() => setGamesOpen(false)} /> : null}
    </header>
  );
};

export default Masthead;
