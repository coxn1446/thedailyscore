import React from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../store/auth.reducer';
import { editionDateline } from '../../utils/edition';
import { DeskNav } from '../Nav/DeskNav';

const Masthead = () => {
  const user = useSelector(selectUser);
  const zone = user?.timezone;

  return (
    <header data-testid="masthead" className="shrink-0 border-b border-border bg-background pt-safe-top">
      <div className="flex items-center justify-between gap-space-md bg-inset px-margin py-space-xs md:px-margin-desktop">
        <p className="font-mono text-caption uppercase text-muted">
          <span className="font-sans text-kicker tracking-kicker text-secondary">Edition</span>
          <span className="px-space-sm text-border-strong">|</span>
          <span>{editionDateline(zone)}</span>
        </p>
        <p className="hidden font-sans text-kicker uppercase tracking-kicker text-primary md:block">
          YOUR DAILY GAMES. ONE SCORE.
        </p>
      </div>
      <div className="hidden px-margin py-space-sm md:px-margin-desktop lg:block">
        <DeskNav />
      </div>
    </header>
  );
};

export default Masthead;
