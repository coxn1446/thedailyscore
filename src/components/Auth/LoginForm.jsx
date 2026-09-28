import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import OAuthButtons from './OAuthButtons';
import { fieldClass, labelClass, primaryButtonClass } from './AuthPageLayout';

const LoginForm = ({ onSubmit, isSubmitting }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ identifier, password });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-space-md">
      <OAuthButtons />
      <div>
        <label htmlFor="identifier" className={labelClass}>
          Email or handle
        </label>
        <input
          id="identifier"
          name="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={fieldClass}
          required
        />
      </div>
      <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
        Sign in
      </button>
      <p className="text-center font-sans text-caption text-muted">
        <Link to="/forgot-password" className="underline decoration-primary underline-offset-2 hover:text-secondary">
          Forgot password?
        </Link>
      </p>
      <p className="text-center font-sans text-body-md text-primary">
        No account?{' '}
        <Link to="/register" className="underline decoration-primary underline-offset-2 hover:text-secondary">
          Create one
        </Link>
      </p>
    </form>
  );
};

export default LoginForm;
