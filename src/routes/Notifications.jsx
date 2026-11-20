import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { inkButtonClass, ruleButtonClass } from '../components/Auth/AuthPageLayout';
import { acceptFriend, declineFriend, notifyFriendsChanged } from '../helpers/friendHelpers';
import {
  fetchNotifications,
  markNotificationsRead,
  notifyNotificationsChanged,
} from '../helpers/notificationHelpers';
import { relativeTime } from '../utils/relativeTime';

const nameOf = (actor) => actor?.display_name || actor?.handle || 'Someone';

const Notifications = () => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [pendingId, setPendingId] = useState(null);

  const load = () => {
    fetchNotifications()
      .then(async (data) => {
        setItems(data.notifications || []);
        setError('');
        if ((data.notifications || []).some((item) => !item.read)) {
          await markNotificationsRead().catch(() => {});
          notifyNotificationsChanged();
        }
      })
      .catch((err) => setError(err.message || 'Could not load notifications.'));
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (item, accept) => {
    if (pendingId) return;
    setPendingId(item.notification_id);
    try {
      if (accept) await acceptFriend(item.friendship_id);
      else await declineFriend(item.friendship_id);
      notifyFriendsChanged();
      load();
    } catch (err) {
      toast.error(err.message || 'Could not update the request');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section data-testid="desk-notifications" className="max-w-measure border-t-2 border-primary pt-space-md">
      <h1 className="font-masthead text-headline-lg text-primary">Notifications</h1>
      {error ? <p role="alert" className="mt-space-md font-sans text-body-md text-error">{error}</p> : null}
      {items && !items.length ? (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">No notifications.</h2>
      ) : null}
      <ul>
        {(items || []).map((item) => {
          const when = relativeTime(item.created_at);
          const pending = item.kind === 'friend_request' && item.friendship_status === 'pending' && item.friendship_id;
          return (
            <li key={item.notification_id} className="border-b border-border py-space-sm">
              <p className="font-sans text-body-md text-primary">
                {item.actor?.handle ? (
                  <Link to={`/profile/${item.actor.handle}`} className="underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary">
                    {nameOf(item.actor)}
                  </Link>
                ) : nameOf(item.actor)}
                {item.kind === 'like' ? ' liked your score.' : null}
                {item.kind === 'comment' ? ' commented on your score.' : null}
                {item.kind === 'friend_request' && item.friendship_status === 'accepted' ? ' is a friend.' : null}
                {item.kind === 'friend_request' && item.friendship_status !== 'accepted' ? ' sent a friend request.' : null}
              </p>
              <p className="mt-space-xs font-mono text-caption text-muted">
                {item.score_id ? (
                  <Link to={`/post/${item.score_id}`} className="underline decoration-primary underline-offset-2 hover:text-secondary">
                    {item.game?.name || 'Score'}
                  </Link>
                ) : null}
                {when ? <span>{item.score_id ? ' · ' : ''}{when}</span> : null}
              </p>
              {pending ? (
                <div className="mt-space-sm flex gap-space-sm">
                  <button type="button" disabled={pendingId === item.notification_id} onClick={() => respond(item, true)} className={inkButtonClass}>
                    Accept
                  </button>
                  <button type="button" disabled={pendingId === item.notification_id} onClick={() => respond(item, false)} className={ruleButtonClass}>
                    Decline
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default Notifications;
