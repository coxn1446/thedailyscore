import React from 'react';

const BrandMark = ({ compact = false }) => (
  <div className="min-w-0">
    <p className="font-masthead text-headline-lg-mobile leading-none text-primary md:text-headline-lg">
      The Daily Score
    </p>
    {compact ? null : (
      <p className="mt-space-xs font-sans text-kicker uppercase tracking-kicker text-secondary">
        The Social Broadsheet of Daily Games
      </p>
    )}
  </div>
);

export default BrandMark;
