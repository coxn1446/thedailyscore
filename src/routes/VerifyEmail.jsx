import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthPageLayout from '../components/Auth/AuthPageLayout';
import { verifyEmail } from '../helpers/authHelpers';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    let cancelled = false;
    verifyEmail(searchParams.get('token'))
      .then(() => {
        if (!cancelled) setStatus('done');
      })
      .catch(() => {
        if (!cancelled) setStatus('failed');
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const title = status === 'done' ? 'Email confirmed' : status === 'failed' ? 'Link expired' : 'Confirming';

  return (
    <AuthPageLayout title={title}>
      {status === 'done' ? (
        <Link to="/" className="font-sans text-body-md underline decoration-primary underline-offset-2">
          Continue
        </Link>
      ) : null}
    </AuthPageLayout>
  );
};

export default VerifyEmail;
