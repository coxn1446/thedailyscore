import React from 'react';
import BrandMark from '../Brand/BrandMark';

const AuthPageLayout = ({ title, children, mark = true }) => (
  <div className="flex min-h-dvh w-full justify-center bg-background px-margin pb-safe-bottom pt-safe-top animate-fade-up">
    <div data-testid="auth-panel" className="w-full max-w-md border border-primary bg-background p-space-lg py-space-xl">
      {mark ? (
        <div className="border-b border-primary pb-space-md">
          <BrandMark />
        </div>
      ) : null}
      <h1 className={`${mark ? 'mt-space-lg' : ''} font-masthead text-headline-lg text-primary text-balance`}>{title}</h1>
      <div className="mt-space-lg">{children}</div>
    </div>
  </div>
);

export const checkboxClass = 'brand-check';

export const fieldClass =
  'mt-space-xs w-full border border-border-strong bg-background px-space-sm py-space-sm text-base text-primary outline-none focus:border-primary';

export const labelClass = 'font-sans text-kicker uppercase tracking-kicker text-muted';

export const primaryButtonClass =
  'w-full bg-primary px-space-md py-space-sm font-sans text-caption font-bold uppercase tracking-kicker text-on-primary hover:bg-secondary';

export const inkButtonClass =
  'inline-flex bg-primary px-space-md py-space-sm font-sans text-caption font-bold uppercase tracking-kicker text-on-primary hover:bg-secondary';

export const ruleButtonClass =
  'inline-flex border border-primary bg-transparent px-space-md py-space-sm font-sans text-caption font-bold uppercase tracking-kicker text-primary hover:bg-primary hover:text-on-primary';

export default AuthPageLayout;
