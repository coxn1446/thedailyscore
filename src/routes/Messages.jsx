import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloseMark, UnreadMark } from '../components/Brand/Marks';
import GroupParlor from '../components/Groups/GroupParlor';
import { gameMark } from '../helpers/gameCatalog';
import { fetchConversations, markParlorRead } from '../helpers/parlorHelpers';
import Loading from '../components/Loading/Loading';

const iconButtonClass = 'inline-flex shrink-0 border border-primary p-space-sm text-primary hover:bg-primary hover:text-on-primary';

const Chatter = ({ chatter }) => {
  const initial = (chatter.display_name || chatter.handle || 'R').trim().charAt(0).toUpperCase();
  if (chatter.portrait_url) {
    return (
      <img
        src={chatter.portrait_url}
        alt=""
        className="portrait h-10 w-10 shrink-0 border border-primary object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="portrait flex h-10 w-10 shrink-0 items-center justify-center border border-primary bg-background font-masthead text-body-md text-primary"
    >
      {initial}
    </span>
  );
};

const Messages = () => {
  const phone = typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches;
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);
  const [entered, setEntered] = useState(false);

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

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return undefined;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const noteSeen = useCallback((id, slug) => {
    markParlorRead(id, slug)
      .then(() => {
        setConversations((current) => {
          if (!current) return current;
          let changed = false;
          const next = current.map((row) => {
            if (String(row.group_id) !== String(id) || row.slug !== slug || Number(row.unread_count) === 0) {
              return row;
            }
            changed = true;
            return { ...row, unread_count: 0 };
          });
          return changed ? next : current;
        });
      })
      .catch(() => {});
  }, []);

  if (!conversations && !error) return <Loading />;

  const rowBody = (conversation, unread, mark, chatters) => (
    <>
      <span aria-label={conversation.game_name} className="shrink-0 font-sans text-headline-md">
        {mark || conversation.game_name}
      </span>
      <span className="flex min-w-0 flex-1 items-center gap-space-xs">
        {unread ? <UnreadMark className="h-3 w-3 shrink-0" /> : null}
        <span className={`truncate font-sans text-body-md ${unread ? 'text-secondary' : 'text-primary'}`}>
          {conversation.group_name}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-space-xs">
        {chatters.map((chatter) => (
          <Chatter key={chatter.user_id} chatter={chatter} />
        ))}
      </span>
    </>
  );

  return (
    <section data-testid="desk-messages" className="relative flex h-full min-h-0 flex-col">
      <h1 className="font-masthead text-headline-lg text-primary">Messages</h1>
      {error ? <p role="alert" className="mt-space-md font-sans text-body-md text-error">{error}</p> : null}
      {conversations?.length ? (
        <ul className="mt-space-lg min-h-0 flex-1 overflow-y-auto">
          {conversations.map((conversation) => {
            const unread = Number(conversation.unread_count) > 0;
            const mark = gameMark(conversation.slug);
            const chatters = (conversation.recent_chatters || []).slice(0, 3);
            return (
              <li key={`${conversation.group_id}-${conversation.slug}`} className="border-b border-border">
                {phone ? (
                  <button
                    type="button"
                    onClick={() => setOpen(conversation)}
                    className="flex w-full items-center gap-space-md py-space-lg text-left"
                  >
                    {rowBody(conversation, unread, mark, chatters)}
                  </button>
                ) : (
                  <Link
                    to={`/groups/${conversation.group_id}?game=${conversation.slug}&chat=1`}
                    className="flex items-center gap-space-md py-space-lg"
                  >
                    {rowBody(conversation, unread, mark, chatters)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <h2 className="mt-space-lg font-masthead text-headline-md text-primary">No messages.</h2>
      )}
      {open ? (
        <div className={`absolute inset-0 z-50 flex flex-col overflow-hidden overscroll-none bg-background transition-transform duration-300 ${entered ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex shrink-0 items-start justify-between gap-space-md">
            <h2 className="font-masthead text-headline-lg text-primary">
              {`${open.group_name} - ${open.game_name}`}
            </h2>
            <button type="button" aria-label="Close" onClick={() => setOpen(null)} className={iconButtonClass}>
              <CloseMark />
            </button>
          </div>
          <div className="mt-space-md flex min-h-0 flex-1 flex-col">
            <GroupParlor
              groupId={open.group_id}
              gameSlug={open.slug}
              onSeen={noteSeen}
              showTitle={false}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default Messages;
