import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { fieldClass, labelClass, primaryButtonClass } from './AuthPageLayout';

const HandleForm = ({ displayName, onSubmit, isSubmitting }) => {
  const [name, setName] = useState(displayName || '');
  const [handle, setHandle] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ displayName: name, handle, acceptedPolicies });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md">
      <div>
        <label htmlFor="display-name" className={labelClass}>
          Display name
        </label>
        <input
          id="display-name"
          name="displayName"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="handle" className={labelClass}>
          Handle
        </label>
        <input
          id="handle"
          name="handle"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <label className="flex items-start gap-space-sm font-sans text-caption text-muted">
        <input
          type="checkbox"
          checked={acceptedPolicies}
          onChange={(event) => setAcceptedPolicies(event.target.checked)}
          className="mt-1 h-4 w-4 border border-primary"
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
  );
};

export default HandleForm;
