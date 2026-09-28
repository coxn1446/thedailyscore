import React from 'react';

const Desk = ({ testId, kicker, title }) => (
  <section data-testid={testId} className="border-t-2 border-primary pt-space-md">
    <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">{kicker}</p>
    <h1 className="mt-space-sm font-masthead text-headline-xl-mobile text-primary text-balance md:text-headline-lg">
      {title}
    </h1>
    <div className="double-rule mt-space-lg" />
  </section>
);

export default Desk;
