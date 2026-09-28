import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthPageLayout from '../components/Auth/AuthPageLayout';
import LoginForm from '../components/Auth/LoginForm';
import { loginWithPassword } from '../helpers/authHelpers';
import { needsHandle } from '../helpers/identity';
import { setUser } from '../store/auth.reducer';
import { safeInternalPath } from '../utils/internalPath';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async ({ identifier, password }) => {
    setIsSubmitting(true);
    try {
      const user = await loginWithPassword(identifier, password);
      dispatch(setUser(user));
      if (needsHandle(user)) {
        navigate('/register', { replace: true });
        return;
      }
      navigate(safeInternalPath(searchParams.get('next')) || '/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout title="Sign in">
      <LoginForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </AuthPageLayout>
  );
};

export default Login;
