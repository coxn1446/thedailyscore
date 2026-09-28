import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fieldClass, inkButtonClass } from '../Auth/AuthPageLayout';
import {
  ExclaimMark,
  HahaMark,
  HeartMark,
  QuestionMark,
  SmileyMark,
  ThumbsDownMark,
  ThumbsUpMark,
} from '../Brand/Marks';
import { fetchParlor, postParlorMessage, reactToMessage } from '../../helpers/parlorHelpers';
import { getSocket } from '../../helpers/socketHelpers';
import { useKeyboardInputClearance } from '../../hooks/useKeyboardInputClearance';

const linkClass = 'text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary';
const COMPOSER_DOCK_DELAY_MS = 250;

const REACTIONS = [
  { kind: 'heart', label: 'Heart', Icon: HeartMark },
  { kind: 'up', label: 'Thumbs up', Icon: ThumbsUpMark },
  { kind: 'down', label: 'Thumbs down', Icon: ThumbsDownMark },
  { kind: 'haha', label: 'Haha', Icon: HahaMark },
  { kind: 'exclaim', label: 'Exclamation', Icon: ExclaimMark },
  { kind: 'question', label: 'Question', Icon: QuestionMark },
];

const stamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
};

const GroupParlor = ({ groupId, gameSlug, onSeen, showTitle = true }) => {
  const [messages, setMessages] = useState([]);
  const [before, setBefore] = useState(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [openReaction, setOpenReaction] = useState(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const formRef = useRef(null);
  const keyboard = useKeyboardInputClearance({ scrollFocusedField: false });
  const lifted = keyboard.enabled && keyboard.keyboardFieldFocused;
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setMessages([]);
    if (!gameSlug) {
      setError('Not posted today');
      setLoading(false);
      return undefined;
    }
    fetchParlor(groupId, gameSlug)
      .then((data) => {
        if (cancelled) return;
        setMessages(data.messages || []);
        setBefore(data.before || null);
        onSeen?.(groupId, gameSlug);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'The parlor could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, gameSlug, onSeen]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onMessage = (message) => {
      if (Number(message?.group_id) !== Number(groupId)) return;
      if (gameSlug && message.game_slug && message.game_slug !== gameSlug) return;
      setMessages((current) => {
        if (current.some((row) => row.message_id === message.message_id)) return current;
        return [...current, message];
      });
      onSeen?.(groupId, gameSlug);
    };
    const onReaction = (payload) => {
      if (Number(payload?.group_id) !== Number(groupId)) return;
      setMessages((current) => current.map((row) => (
        row.message_id === payload.message_id ? { ...row, reactions: payload.reactions || [] } : row
      )));
    };
    socket.on('parlor:message', onMessage);
    socket.on('parlor:reaction', onReaction);
    return () => {
      socket.off?.('parlor:message', onMessage);
      socket.off?.('parlor:reaction', onReaction);
    };
  }, [groupId, gameSlug, onSeen]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, loading]);

  useEffect(() => {
    if (!lifted) {
      setDocked(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setDocked(true), COMPOSER_DOCK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [lifted]);

  useLayoutEffect(() => {
    const form = formRef.current;
    const list = listRef.current;
    if (!form) return undefined;
    if (!docked) {
      form.style.top = '';
      form.style.bottom = '';
      if (list) list.style.paddingBottom = '';
      return undefined;
    }
    const place = () => {
      const height = form.offsetHeight;
      const viewport = window.visualViewport;
      if (viewport) {
        const top = Math.max(0, viewport.offsetTop + viewport.height - height);
        form.style.top = `${top}px`;
        form.style.bottom = 'auto';
      } else {
        form.style.top = 'auto';
        form.style.bottom = '0px';
      }
      if (list) list.style.paddingBottom = `${height}px`;
    };
    place();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', place);
    viewport?.addEventListener('scroll', place);
    return () => {
      viewport?.removeEventListener('resize', place);
      viewport?.removeEventListener('scroll', place);
    };
  }, [docked, body, error]);

  const loadEarlier = async () => {
    if (!before) return;
    const data = await fetchParlor(groupId, gameSlug, before);
    setMessages((current) => {
      const ids = new Set(current.map((row) => row.message_id));
      const older = (data.messages || []).filter((row) => !ids.has(row.message_id));
      return [...older, ...current];
    });
    setBefore(data.before || null);
  };

  const send = async (event) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError('');
    try {
      const data = await postParlorMessage(groupId, gameSlug, text);
      setBody('');
      if (data.message) {
        setMessages((current) => {
          if (current.some((row) => row.message_id === data.message.message_id)) return current;
          return [...current, data.message];
        });
      }
    } catch (err) {
      setError(err.message || 'Could not send');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const react = async (messageId, kind) => {
    setOpenReaction(null);
    try {
      const data = await reactToMessage(groupId, messageId, kind);
      setMessages((current) => current.map((row) => (
        row.message_id === messageId ? { ...row, reactions: data.reactions || [] } : row
      )));
    } catch (err) {
      setError(err.message || 'Could not react');
    }
  };

  const locked = error === 'Not posted today';

  return (
    <section data-testid="group-parlor" className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      {showTitle ? <h2 className="font-masthead text-headline-lg text-primary">Chat</h2> : null}
      {loading ? null : locked ? (
        <p className="mt-space-lg font-sans text-body-md text-primary">
          You haven&apos;t played this game yet today, submit your score{' '}
          <Link to="/" className={linkClass}>here</Link>
          {' '}to unlock the chat
        </p>
      ) : (
      <>
      <div ref={listRef} className="mt-space-sm min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain">
        {before ? (
          <button type="button" onClick={loadEarlier} className="font-sans text-body-md text-primary underline decoration-primary underline-offset-2 hover:text-secondary hover:decoration-secondary">
            Earlier
          </button>
        ) : null}
        {loading ? null : messages.length ? (
          <ol>
            {messages.map((message) => (
              <li key={message.message_id} className="border-b border-border py-space-sm">
                <p className="font-sans text-body-md text-primary">
                  <span className="font-bold">{message.display_name || message.handle}</span>
                  {stamp(message.created_at) ? (
                    <span className="ml-space-sm font-mono text-caption text-muted">{stamp(message.created_at)}</span>
                  ) : null}
                </p>
                <div className="mt-space-xs flex items-start gap-space-xs">
                  <p className="min-w-0 whitespace-pre-wrap font-sans text-body-md text-primary">{message.body}</p>
                  <button
                    type="button"
                    aria-label="Add reaction"
                    aria-expanded={openReaction === message.message_id}
                    onClick={() => setOpenReaction((current) => (current === message.message_id ? null : message.message_id))}
                    className="shrink-0 text-muted hover:text-primary"
                  >
                    <SmileyMark />
                  </button>
                </div>
                <div className="mt-space-xs flex flex-wrap items-center gap-space-xs">
                  {(message.reactions || []).map((reaction) => {
                    const spec = REACTIONS.find((item) => item.kind === reaction.kind);
                    const Icon = spec?.Icon;
                    return (
                      <button
                        key={reaction.kind}
                        type="button"
                        aria-pressed={reaction.mine}
                        aria-label={spec?.label || reaction.kind}
                        onClick={() => react(message.message_id, reaction.kind)}
                        className={`inline-flex items-center gap-space-xs border px-space-xs font-mono text-caption ${reaction.mine ? 'border-secondary text-secondary' : 'border-border text-primary'}`}
                      >
                        {Icon ? <Icon /> : reaction.kind} {reaction.count}
                      </button>
                    );
                  })}
                </div>
                {openReaction === message.message_id ? (
                  <div className="mt-space-xs flex flex-wrap gap-space-xs">
                    {REACTIONS.map((reaction) => {
                      const Icon = reaction.Icon;
                      return (
                        <button
                          key={reaction.kind}
                          type="button"
                          aria-label={reaction.label}
                          onClick={() => react(message.message_id, reaction.kind)}
                          className="inline-flex border border-primary px-space-sm py-space-xs text-primary"
                        >
                          <Icon className="h-5 w-5" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <h3 className="mt-space-lg font-masthead text-headline-md text-primary">The parlor is quiet.</h3>
        )}
      </div>
      <form
        ref={formRef}
        data-testid="parlor-composer"
        onSubmit={send}
        className={`${docked ? 'fixed inset-x-0 z-50 px-margin' : 'shrink-0'} border-t border-border bg-background pt-space-sm`}
        onPointerDown={keyboard.onPointerDown}
        onFocus={keyboard.onFocusIn}
        onBlur={keyboard.onFocusOut}
      >
        <label htmlFor={`parlor-message-${groupId}`} className="sr-only">Message</label>
        <textarea
          id={`parlor-message-${groupId}`}
          ref={inputRef}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Message"
          rows={2}
          className={fieldClass}
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          onPointerDown={(event) => event.preventDefault()}
          className={`${inkButtonClass} mt-space-sm w-full justify-center`}
        >
          Send
        </button>
        {error ? (
          <p role="alert" className="mt-space-sm font-sans text-body-md text-error">{error}</p>
        ) : null}
      </form>
      </>
      )}
    </section>
  );
};

export default GroupParlor;
