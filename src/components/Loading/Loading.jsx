import React from 'react';

const Loading = ({ label = 'Setting type…' }) => (
  <div className="flex min-h-[40vh] items-center justify-center font-mono text-caption uppercase tracking-kicker text-muted animate-soft-pulse">
    {label}
  </div>
);

export default Loading;
