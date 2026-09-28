import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UnreadMark } from '../components/Brand/Marks';
import { fetchConversations } from '../helpers/parlorHelpers';
import Loading from '../components/Loading/Loading';

const Messages = () => {
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((data) => {
        if (!cancelled) setConversations(data.conversations || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not load messages.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!conversations && !error) return <Loading />;

  return (
    <section data-testid="desk-messages" className="flex h-full min-h-0 flex-col">
      <h1 className="font-masthead text-headline-lg text-primary">Messages</h1>
      {error ? <p role="alert" className="mt-space-md font-sans text-body-md text-error">{error}</p> : null}
      {conversations?.length ? (
        <div className="mt-space-lg flex min-h-0 flex-1 flex-col">
          <div className="grid grid-cols-3 gap-space-sm border-b border-border pb-space-xs">
            <span className="font-sans text-caption uppercase text-muted">Group Name</span>
            <span className="font-sans text-caption uppercase text-muted">Game Name</span>
            <span className="font-sans text-caption uppercase text-muted">Latest Message</span>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {conversations.map((conversation) => {
              const unread = Number(conversation.unread_count) > 0;
              return (
                <li key={`${conversation.group_id}-${conversation.slug}`} className="border-b border-border">
                  <Link
                    to={`/groups/${conversation.group_id}?game=${conversation.slug}&chat=1`}
                    className="grid grid-cols-3 items-center gap-space-sm py-space-sm"
                  >
                    <span className="flex min-w-0 items-center gap-space-xs">
                      {unread ? <UnreadMark className="h-3 w-3 shrink-0" /> : null}
                      <span className={`truncate font-sans text-caption ${unread ? 'text-secondary' : 'text-primary'}`}>
                        {conversation.group_name}
                      </span>
                    </span>
                    <span className="truncate font-sans text-caption text-primary">{conversation.game_name}</span>
                    <span className="truncate font-sans text-caption text-muted">{conversation.last_message || ''}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">No messages.</h2>
      )}
    </section>
  );
};

export default Messages;
