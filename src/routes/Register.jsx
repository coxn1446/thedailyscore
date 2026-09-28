import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import AuthPageLayout from '../components/Auth/AuthPageLayout';
import RegisterForm from '../components/Auth/RegisterForm';
import HandleForm from '../components/Auth/HandleForm';
import { claimHandle, registerWithPassword } from '../helpers/authHelpers';
import { clientTimezone, needsHandle } from '../helpers/identity';
import { selectIsAuthenticated, selectUser, setUser } from '../store/auth.reducer';

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const choosingHandle = isAuthenticated && needsHandle(user);

  const finish = (nextUser) => {
    dispatch(setUser(nextUser));
    navigate('/', { replace: true });
  };

  const handleRegister = async (values) => {
    setIsSubmitting(true);
    try {
      const nextUser = await registerWithPassword({ ...values, timezone: clientTimezone() });
      finish(nextUser);
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaim = async (values) => {
    setIsSubmitting(true);
    try {
      const nextUser = await claimHandle({ ...values, timezone: clientTimezone() });
      finish(nextUser);
    } catch (err) {
      toast.error(err.message || 'Could not save handle');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthenticated && !needsHandle(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthPageLayout title={choosingHandle ? 'Choose a handle' : 'Create account'}>
      {choosingHandle ? (
        <HandleForm
          displayName={user?.display_name}
          onSubmit={handleClaim}
          isSubmitting={isSubmitting}
        />
      ) : (
        <RegisterForm onSubmit={handleRegister} isSubmitting={isSubmitting} />
      )}
    </AuthPageLayout>
  );
};

export default Register;
