import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { NavLink, useLocation } from 'react-router-dom';
import { GroupsMark, HomeMark, MessagesMark } from '../Brand/Marks';
import { fetchConversations } from '../../helpers/parlorHelpers';
import { selectUser } from '../../store/auth.reducer';

export const DESK_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/groups', label: 'Groups', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

const MOBILE_LINKS = [
  { ...DESK_LINKS[0], Icon: HomeMark },
  { ...DESK_LINKS[1], Icon: GroupsMark },
  { to: '/messages', label: 'Messages', end: false, Icon: MessagesMark },
  { ...DESK_LINKS[2], Icon: null },
];

const NavPortrait = ({ user }) => {
  const initial = (user?.display_name || user?.handle || 'R').trim().charAt(0).toUpperCase();
  if (user?.portrait_url) {
    return <img src={user.portrait_url} alt="" className="portrait h-6 w-6 border border-primary object-cover" />;
  }
  return (
    <span
      aria-hidden="true"
      className="portrait flex h-6 w-6 items-center justify-center border border-primary bg-background font-masthead text-caption text-primary"
    >
      {initial}
    </span>
  );
};

const desktopClass = ({ isActive }) =>
  `border-b-2 py-space-sm font-sans text-kicker uppercase tracking-kicker ${
    isActive ? 'border-secondary text-primary' : 'border-transparent text-muted hover:text-primary'
  }`;

const tabClass = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-space-xs py-space-sm text-center font-sans text-kicker uppercase tracking-kicker ${
    isActive ? 'text-secondary' : 'text-muted'
  }`;

export const DeskNav = ({ className = '' }) => (
  <nav aria-label="Desks" className={`hidden items-center gap-space-lg lg:flex ${className}`}>
    {DESK_LINKS.map((link) => (
      <NavLink key={link.to} to={link.to} end={link.end} className={desktopClass}>
        {link.label}
      </NavLink>
    ))}
  </nav>
);

export const MobileTabBar = () => {
  const { pathname } = useLocation();
  const user = useSelector(selectUser);
  const [unreadConversations, setUnreadConversations] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetchConversations()
      .then((data) => {
        if (cancelled) return;
        const count = (data.conversations || []).filter((row) => Number(row.unread_count) > 0).length;
        setUnreadConversations(count);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <nav
      aria-label="Desks"
      data-testid="mobile-tab-bar"
      className="grid shrink-0 grid-cols-4 border-t border-border bg-background pb-safe-bottom lg:hidden"
    >
      {MOBILE_LINKS.map((link) => {
        const Icon = link.Icon;
        return (
          <NavLink key={link.to} to={link.to} end={link.end} className={tabClass}>
            <span className="relative">
              {Icon ? <Icon className="h-6 w-6" /> : <NavPortrait user={user} />}
              {link.to === '/messages' && unreadConversations > 0 ? (
                <span className="absolute right-0 top-0 bg-secondary px-space-xs font-mono text-caption text-on-primary">
                  {unreadConversations > 99 ? '99' : unreadConversations}
                </span>
              ) : null}
            </span>
            <span>{link.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
