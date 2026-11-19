import React from 'react';
import { Link } from 'react-router-dom';

const linkClass = 'underline decoration-primary underline-offset-2 hover:text-secondary';

const LegalLinks = ({ className = 'mt-space-lg text-center font-sans text-caption text-muted' }) => (
  <p className={className}>
    <Link to="/terms" className={linkClass}>
      Terms of Service
    </Link>
    <span aria-hidden="true"> · </span>
    <Link to="/privacy" className={linkClass}>
      Privacy
    </Link>
    <span aria-hidden="true"> · </span>
    <Link to="/account-deletion" className={linkClass}>
      Account Deletion
    </Link>
    <span aria-hidden="true"> · </span>
    <Link to="/support" className={linkClass}>
      Support
    </Link>
  </p>
);

export default LegalLinks;
