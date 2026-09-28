import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import OAuthButtons from './OAuthButtons';
import { fieldClass, labelClass, primaryButtonClass } from './AuthPageLayout';

const RegisterForm = ({ onSubmit, isSubmitting }) => {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ displayName, handle, email, password, acceptedPolicies });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md">
      <OAuthButtons />
      <div>
        <label htmlFor="display-name" className={labelClass}>
          Display name
        </label>
        <input
          id="display-name"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
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
          autoComplete="username"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        Create account
      </button>
      <p className="text-center font-sans text-body-md text-primary">
        Already registered?{' '}
        <Link to="/login" className="underline decoration-primary underline-offset-2 hover:text-secondary">
          Sign in
        </Link>
      </p>
    </form>
  );
};

export default RegisterForm;
