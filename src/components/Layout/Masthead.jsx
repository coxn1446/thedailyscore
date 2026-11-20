import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated, selectUser } from '../../store/auth.reducer';
import { clientTimezone } from '../../helpers/identity';
import { editionDateline } from '../../utils/edition';
import { inkButtonClass } from '../Auth/AuthPageLayout';
import { GearMark } from '../Brand/Marks';
import GamePicker from '../Games/GamePicker';
import { DeskNav } from '../Nav/DeskNav';

const Masthead = () => {
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const zone = user?.timezone || clientTimezone();
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
          {isAuthenticated ? (
            <button
              type="button"
              aria-label="Select Your Games"
              onClick={() => setGamesOpen(true)}
              className="p-space-xs text-primary lg:hidden"
            >
              <GearMark />
            </button>
          ) : (
            <Link to="/login" className={`${inkButtonClass} lg:hidden`}>
              Log In
            </Link>
          )}
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
