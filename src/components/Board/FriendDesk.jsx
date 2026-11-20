import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { signedOutLoginTarget } from '../../helpers/accountDeleted';
import { selectUser } from '../../store/auth.reducer';
import { fieldClass, inkButtonClass, ruleButtonClass } from '../Auth/AuthPageLayout';
import {
  acceptFriend,
  declineFriend,
  fetchFriends,
  notifyFriendsChanged,
  removeFriend,
  requestFriend,
  searchFriends,
} from '../../helpers/friendHelpers';

const FriendTable = ({ people, renderAction }) => (
  <table className="mt-space-sm w-full">
    <tbody>
      {people.map((person) => (
        <tr key={person.friendship_id || person.user_id} className="border-b border-border">
          <td className="py-space-sm font-sans text-body-md text-primary">{person.display_name || person.handle}</td>
          <td className="py-space-sm text-right">{renderAction(person)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

const FriendDesk = ({ onChange }) => {
  const user = useSelector(selectUser);
  const navigate = useNavigate();
  const location = useLocation();
  const [desk, setDesk] = useState(null);
  const [handle, setHandle] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const load = () => {
    fetchFriends()
      .then((data) => {
        setDesk(data);
        onChange?.();
      })
      .catch((err) => setError(err.message || 'Could not load friends.'));
  };

  const askToSignIn = () => {
    navigate(signedOutLoginTarget(location.pathname, location.search).to);
  };

  useEffect(() => {
    if (!user?.user_id) return undefined;
    let cancelled = false;
    fetchFriends()
      .then((data) => {
        if (!cancelled) setDesk(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load friends.');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.user_id]);

  useEffect(() => {
    const queryText = handle.trim().replace(/^@+/, '');
    if (!user?.user_id || !queryText) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    searchFriends(queryText)
      .then((data) => {
        if (!cancelled) setResults(data.users || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not search.');
      });
    return () => {
      cancelled = true;
    };
  }, [handle, user?.user_id]);

  const run = async (work) => {
    if (pending) return;
    setPending(true);
    setError('');
    try {
      await work();
      notifyFriendsChanged();
      load();
      if (handle.trim()) {
        const data = await searchFriends(handle.trim().replace(/^@+/, ''));
        setResults(data.users || []);
      }
    } catch (err) {
      setError(err.message || 'Could not update friends.');
    } finally {
      setPending(false);
    }
  };

  const requestLabel = (person) => {
    if (person.relation === 'friends') return 'Friends';
    if (person.relation === 'outgoing') return 'Requested';
    if (person.relation === 'incoming') return 'Accept';
    return 'Request';
  };

  return (
    <section aria-label="Friends" className="mt-space-lg max-w-measure">
      <label className="font-sans text-kicker uppercase tracking-kicker text-muted">
        Handle
        <input
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          placeholder="handle"
          autoCapitalize="off"
          autoCorrect="off"
          className={fieldClass}
        />
      </label>
      {results.length ? (
        <ul className="mt-space-md">
          {results.map((person) => (
            <li key={person.user_id} className="flex items-center justify-between gap-space-md border-b border-border py-space-sm">
              <span className="font-sans text-body-md text-primary">{person.display_name || person.handle}</span>
              <button
                type="button"
                disabled={pending || person.relation === 'friends' || person.relation === 'outgoing'}
                onClick={() => {
                  if (!user?.user_id) {
                    askToSignIn();
                    return;
                  }
                  run(() => (
                    person.relation === 'incoming'
                      ? acceptFriend(person.friendship_id)
                      : requestFriend(person.handle)
                  ));
                }}
                className={person.relation === 'none' || person.relation === 'incoming' ? inkButtonClass : ruleButtonClass}
              >
                {requestLabel(person)}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? (
        <p role="alert" className="mt-space-sm font-sans text-body-md text-error">
          {error}
        </p>
      ) : null}
      {desk ? (
        <>
          <h2 className="mt-space-lg font-sans text-kicker uppercase tracking-kicker text-secondary">Sent Requests</h2>
          {desk.outgoing?.length ? (
            <FriendTable
              people={desk.outgoing}
              renderAction={(person) => (
                <button type="button" disabled={pending} onClick={() => run(() => removeFriend(person.friendship_id))} className={ruleButtonClass}>
                  Cancel
                </button>
              )}
            />
          ) : null}
          <h2 className="mt-space-lg font-sans text-kicker uppercase tracking-kicker text-secondary">Inbox</h2>
          {desk.incoming?.length ? (
            <FriendTable
              people={desk.incoming}
              renderAction={(person) => (
                <span className="inline-flex gap-space-sm">
                  <button type="button" disabled={pending} onClick={() => run(() => acceptFriend(person.friendship_id))} className={inkButtonClass}>
                    Accept
                  </button>
                  <button type="button" disabled={pending} onClick={() => run(() => declineFriend(person.friendship_id))} className={ruleButtonClass}>
                    Decline
                  </button>
                </span>
              )}
            />
          ) : null}
        </>
      ) : null}
      {desk && !desk.friends?.length && !desk.incoming?.length && !desk.outgoing?.length ? (
        <h2 className="mt-space-md font-masthead text-headline-md text-primary">No friends yet.</h2>
      ) : null}
      {desk?.friends?.length ? (
        <FriendTable
          people={desk.friends}
          renderAction={(person) => (
            <button type="button" disabled={pending} onClick={() => run(() => removeFriend(person.friendship_id))} className={ruleButtonClass}>
              Unfriend
            </button>
          )}
        />
      ) : null}
    </section>
  );
};

export default FriendDesk;
