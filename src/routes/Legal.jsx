import React from 'react';
import { Link } from 'react-router-dom';

const LegalPage = ({ title, children }) => (
  <article className="mx-auto max-w-measure px-margin py-space-xl">
    <h1 className="font-masthead text-headline-lg text-primary">{title}</h1>
    <div className="mt-space-lg space-y-space-md font-sans text-body-md text-primary">{children}</div>
    <p className="mt-space-lg">
      <Link to="/login" className="underline decoration-primary underline-offset-2 hover:text-secondary">
        Sign in
      </Link>
    </p>
  </article>
);

export const TermsOfService = () => (
  <LegalPage title="Terms of Service">
    <p>Scores you publish stay inside the groups that receive them.</p>
    <p>You keep the handle you choose. It is unique on The Daily Score.</p>
  </LegalPage>
);

export const Privacy = () => (
  <LegalPage title="Privacy Policy">
    <p>The Daily Score stores your display name, handle, email, and timezone so the edition can find you.</p>
    <p>There is no public feed.</p>
  </LegalPage>
);
