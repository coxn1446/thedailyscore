import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Loading from '../components/Loading/Loading';
import { joinGroup } from '../helpers/groupHelpers';

const JoinGroup = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    joinGroup(token)
      .then((payload) => {
        if (!cancelled) navigate(`/groups/${payload.group.group_id}`, { replace: true });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not join');
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  if (error) {
    return (
      <section className="max-w-measure border-t-2 border-primary pt-space-md">
        <p className="font-sans text-kicker uppercase tracking-kicker text-secondary">Invite</p>
        <h1 className="mt-space-sm font-masthead text-headline-lg text-primary">Invite closed</h1>
        <p role="alert" className="mt-space-md font-sans text-body-md text-error">
          {error}
        </p>
        <Link
          to="/groups"
          className="mt-space-lg inline-flex font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary"
        >
          Groups
        </Link>
      </section>
    );
  }

  return <Loading />;
};

export default JoinGroup;
