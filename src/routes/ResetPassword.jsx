import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthPageLayout, { fieldClass, labelClass, primaryButtonClass } from '../components/Auth/AuthPageLayout';
import { resetPassword } from '../helpers/authHelpers';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await resetPassword({ token: searchParams.get('token'), password });
      setDone(true);
    } catch (err) {
      toast.error(err.message || 'Could not reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout title="New password">
      {done ? (
        <Link to="/login" className="font-sans text-body-md underline decoration-primary underline-offset-2">
          Sign in
        </Link>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-space-md">
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={fieldClass}
              required
            />
          </div>
          <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
            Save password
          </button>
        </form>
      )}
    </AuthPageLayout>
  );
};

export default ResetPassword;
