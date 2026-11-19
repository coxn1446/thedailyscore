import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { checkboxClass, primaryButtonClass } from '../Auth/AuthPageLayout';
import { acceptPolicies } from '../../helpers/authHelpers';
import { POLICY_EFFECTIVE } from '../../helpers/policyDate';
import { setUser } from '../../store/auth.reducer';

const LEGAL_PATHS = new Set(['/terms', '/privacy', '/account-deletion', '/support']);

const PolicyAcceptanceDialog = () => {
  const dispatch = useDispatch();
  const { pathname } = useLocation();
  const [accepted, setAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (LEGAL_PATHS.has(pathname)) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!accepted) return;
    setIsSubmitting(true);
    try {
      const nextUser = await acceptPolicies();
      dispatch(setUser(nextUser));
    } catch (err) {
      toast.error(err.message || 'Could not save your agreement');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/20 px-margin">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-acceptance-title"
        className="w-full max-w-sm border border-primary bg-background p-space-lg"
      >
        <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">The Daily Score</p>
        <h2 id="policy-acceptance-title" className="mt-space-sm font-masthead text-headline-md text-primary">
          Terms and Privacy
        </h2>
        <p className="mt-space-md font-sans text-body-md text-primary">
          The Terms of Service and Privacy Policy changed on {POLICY_EFFECTIVE}.
        </p>
        <form onSubmit={handleSubmit} className="mt-space-lg space-y-space-md">
          <label className="flex items-start gap-space-sm font-sans text-caption text-muted">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(event) => setAccepted(event.target.checked)}
              className={`mt-1 ${checkboxClass}`}
              required
            />
            <span>
              I agree to the{' '}
              <Link to="/terms" className="underline decoration-primary underline-offset-2 hover:text-secondary">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="underline decoration-primary underline-offset-2 hover:text-secondary">
                Privacy Policy
              </Link>
              .
            </span>
          </label>
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default PolicyAcceptanceDialog;
