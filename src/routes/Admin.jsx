import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { fetchGameRequests, markRequestsSeen, notifyAdminSeen } from '../helpers/adminHelpers';
import { selectUser } from '../store/auth.reducer';

const formatWhen = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const Admin = () => {
  const user = useSelector(selectUser);
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.is_admin) return undefined;
    let cancelled = false;
    fetchGameRequests()
      .then(async (data) => {
        if (cancelled) return;
        setRequests(data.requests || []);
        if ((data.requests || []).some((row) => !row.seen)) {
          await markRequestsSeen().catch(() => {});
          notifyAdminSeen();
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load requests.');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.is_admin]);

  if (!user?.is_admin) return <Navigate to="/" replace />;

  return (
    <section data-testid="desk-admin" className="max-w-measure border-t-2 border-primary pt-space-md">
      <h1 className="font-masthead text-headline-lg text-primary">Game requests</h1>
      {error ? <p role="alert" className="mt-space-md font-sans text-body-md text-error">{error}</p> : null}
      {requests && !requests.length ? (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">No requests.</h2>
      ) : null}
      {requests?.length ? (
        <table className="mt-space-lg w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="py-space-sm text-left font-sans text-kicker uppercase tracking-kicker text-muted">Game</th>
              <th className="py-space-sm text-left font-sans text-kicker uppercase tracking-kicker text-muted">From</th>
              <th className="py-space-sm text-right font-sans text-kicker uppercase tracking-kicker text-muted">Filed</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((row) => (
              <tr key={row.request_id} className="border-b border-border">
                <td className="py-space-sm font-sans text-body-md text-primary">
                  {row.game_name}
                  {row.note ? <span className="block font-mono text-caption text-muted">{row.note}</span> : null}
                </td>
                <td className="py-space-sm font-sans text-body-md text-primary">{row.display_name || row.handle}</td>
                <td className="py-space-sm text-right font-mono text-caption text-muted">{formatWhen(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
};

export default Admin;
