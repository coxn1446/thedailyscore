import React from 'react';

const frame = (className = 'h-5 w-5') => className;

export const HomeMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M3.5 10.5L12 3.5l8.5 7v9.5H14.5v-6h-5v6H3.5v-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
  </svg>
);

export const GroupsMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="16" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2.5 19.5c0-3.3 2.7-5.5 5.5-5.5s5.5 2.2 5.5 5.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14.5 15.5c1.8-.2 4 1 4 4" stroke="currentColor" strokeWidth="1.3" />
  </svg>
);

export const MessagesMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <rect x="3" y="5.5" width="18" height="13" stroke="currentColor" strokeWidth="1.5" />
    <path d="M3.5 6.5l8.5 7 8.5-7" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
  </svg>
);

export const UnreadMark = ({ className = 'h-4 w-4' }) => (
  <svg role="img" aria-label="Unread" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <rect x="7" y="7" width="10" height="10" className="fill-secondary stroke-secondary" strokeWidth="1" />
  </svg>
);

export const CloseMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <line x1="5.5" y1="5.5" x2="18.5" y2="18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <line x1="18.5" y1="5.5" x2="5.5" y2="18.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

export const HeartMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path
      d="M12 20.5l-1.3-1.18C5.8 14.9 2.5 11.9 2.5 8.1 2.5 5 4.9 2.6 8 2.6c1.74 0 3.41.81 4 2.09.59-1.28 2.26-2.09 4-2.09 3.1 0 5.5 2.4 5.5 5.5 0 3.8-3.3 6.8-8.2 11.22L12 20.5z"
      className="fill-secondary stroke-secondary"
      strokeWidth="1.5"
      fillOpacity="0.08"
    />
  </svg>
);

export const ExclaimMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <rect x="10.8" y="4" width="2.4" height="10.5" className="fill-current" />
    <rect x="10.8" y="17.2" width="2.4" height="2.8" className="fill-current" />
  </svg>
);

export const ThumbsDownMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M7 3h-3.5v10H7m0-10l9.5 0c1.2 0 2.2.9 2.3 2.1l.9 6c.1 1.3-.9 2.4-2.2 2.4H14v6c0 1.4-.9 2.5-2.2 2.5-.9 0-1.5-.6-1.7-1.4L7 13V3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
  </svg>
);

export const QuestionMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M8.5 7.5C8.5 5.5 10.1 4 12.2 4c2.2 0 3.8 1.4 3.8 3.3 0 1.8-1.2 2.7-2.4 3.6-1.1.8-1.6 1.7-1.6 3.1h2M12 17.5v2.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="square" />
  </svg>
);

export const CalendarMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <rect x="3.5" y="4.5" width="17" height="16" stroke="currentColor" strokeWidth="1.5" />
    <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="7.5" y1="2.5" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <line x1="16.5" y1="2.5" x2="16.5" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <rect x="7" y="12.5" width="3" height="3" className="fill-secondary" />
    <circle cx="14" cy="14" r="1.2" className="fill-current" />
    <circle cx="17" cy="14" r="1.2" className="fill-current" />
    <circle cx="14" cy="17.5" r="1.2" className="fill-current" />
    <circle cx="17" cy="17.5" r="1.2" className="fill-current" />
  </svg>
);

export const HahaMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M7.5 9l2 1.5-2 1.5M16.5 9l-2 1.5 2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="square" />
    <path d="M7.5 14.5c1 2.2 2.5 3 4.5 3s3.5-.8 4.5-3H7.5z" stroke="currentColor" strokeWidth="1.4" className="fill-current" fillOpacity="0.12" />
  </svg>
);

export const ChatMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M3.75 5.25h16.5v11.5H8.25L4.5 19.75v-3H3.75V5.25z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
    <line x1="7" y1="9" x2="17" y2="9" stroke="currentColor" strokeWidth="1.2" />
    <line x1="7" y1="12.5" x2="13.5" y2="12.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const PlusMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <circle cx="12" cy="12" r="8.75" stroke="currentColor" strokeWidth="1.5" />
    <line x1="12" y1="7.5" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
    <line x1="7.5" y1="12" x2="16.5" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
  </svg>
);

export const ThumbsUpMark = ({ className = 'h-4 w-4' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M7 21h-3.5v-10H7m0 10l9.5 0c1.2 0 2.2-.9 2.3-2.1l.9-6c.1-1.3-.9-2.4-2.2-2.4H14V4.5c0-1.4-.9-2.5-2.2-2.5-.9 0-1.5.6-1.7 1.4L7 11v10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
  </svg>
);

export const GearMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <path d="M10.2 2.5h3.6l.5 2.1c.5.2 1 .5 1.5.8l2-1 2.6 2.6-1 2c.3.5.6 1 .8 1.5l2.1.5v3.6l-2.1.5c-.2.5-.5 1-.8 1.5l1 2-2.6 2.6-2-1c-.5.3-1 .6-1.5.8l-.5 2.1h-3.6l-.5-2.1c-.5-.2-1-.5-1.5-.8l-2 1-2.6-2.6 1-2c-.3-.5-.6-1-.8-1.5l-2.1-.5v-3.6l2.1-.5c.2-.5.5-1 .8-1.5l-1-2 2.6-2.6 2 1c.5-.3 1-.6 1.5-.8l.5-2.1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3.25" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

export const SmileyMark = ({ className = 'h-5 w-5' }) => (
  <svg aria-hidden="true" viewBox="0 0 24 24" className={frame(className)} fill="none">
    <circle cx="11.5" cy="12.5" r="8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="9" cy="10.5" r="1" className="fill-current" />
    <circle cx="14" cy="10.5" r="1" className="fill-current" />
    <path d="M8.5 14.5c.8 1.4 2.2 2 3 2s2.2-.6 3-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
    <circle cx="18.5" cy="5.5" r="4.25" className="fill-background stroke-current" strokeWidth="1.2" />
    <line x1="18.5" y1="3.5" x2="18.5" y2="7.5" className="stroke-secondary" strokeWidth="1.3" strokeLinecap="square" />
    <line x1="16.5" y1="5.5" x2="20.5" y2="5.5" className="stroke-secondary" strokeWidth="1.3" strokeLinecap="square" />
  </svg>
);
