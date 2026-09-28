import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthPageLayout, { fieldClass, labelClass, primaryButtonClass } from '../components/Auth/AuthPageLayout';
import { forgotPassword } from '../helpers/authHelpers';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await forgotPassword(email);
      toast.success('If that email is registered, a reset link is on the way.');
    } catch (err) {
      toast.error(err.message || 'Could not send reset email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout title="Reset password">
      <form onSubmit={handleSubmit} className="space-y-space-md">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={fieldClass}
            required
          />
        </div>
        <button type="submit" className={primaryButtonClass} disabled={isSubmitting}>
          Send link
        </button>
        <p className="text-center font-sans text-body-md">
          <Link to="/login" className="underline decoration-primary underline-offset-2 hover:text-secondary">
            Sign in
          </Link>
        </p>
      </form>
    </AuthPageLayout>
  );
};

export default ForgotPassword;
