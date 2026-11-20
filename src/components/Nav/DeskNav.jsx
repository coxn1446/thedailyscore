import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BoardMark, HomeMark, AdminMark, AlertMark } from '../Brand/Marks';
import { selectUser } from '../../store/auth.reducer';
import { fetchUnreadNotifications, NOTIFICATIONS_EVENT } from '../../helpers/notificationHelpers';
import { ADMIN_EVENT, fetchUnseenRequests } from '../../helpers/adminHelpers';

export const HOME_TOP_EVENT = 'ds:home-top';

const scrollHomeToTop = (event, pathname) => {
  try {
    sessionStorage.setItem('ds:home-scroll', '0');
  } catch {
    /* private mode */
  }
  if (pathname === '/') {
    event.preventDefault();
    window.dispatchEvent(new Event(HOME_TOP_EVENT));
  }
};

export const DESK_LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/board', label: 'Board', end: false },
  { to: '/notifications', label: 'Notifications', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

const MOBILE_LINKS = [
  { ...DESK_LINKS[0], Icon: HomeMark },
  { ...DESK_LINKS[1], Icon: BoardMark },
  { ...DESK_LINKS[2], Icon: AlertMark },
  { ...DESK_LINKS[3], Icon: null },
];

const NavPortrait = ({ user }) => {
  const initial = (user?.display_name || user?.handle || 'Guest').trim().charAt(0).toUpperCase();
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

const useUnreadCount = () => {
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.user_id) return undefined;
    let cancelled = false;
    const load = () => {
      fetchUnreadNotifications()
        .then((data) => {
          if (!cancelled) setCount(Number(data.count) || 0);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };
    load();
    window.addEventListener(NOTIFICATIONS_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_EVENT, load);
    };
  }, [user?.user_id, pathname]);

  return count;
};

const useUnseenRequests = () => {
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.is_admin) return undefined;
    let cancelled = false;
    const load = () => {
      fetchUnseenRequests()
        .then((data) => {
          if (!cancelled) setCount(Number(data.count) || 0);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };
    load();
    window.addEventListener(ADMIN_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(ADMIN_EVENT, load);
    };
  }, [user?.is_admin, pathname]);

  return count;
};

const RequestBadge = ({ count }) => (
  count > 0 ? (
    <span className="ml-space-xs bg-secondary px-space-xs font-mono text-caption text-on-primary">
      {count > 99 ? '99' : count}
    </span>
  ) : null
);

export const DeskNav = ({ className = '' }) => {
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const unread = useUnreadCount();
  const unseen = useUnseenRequests();
  const links = user?.is_admin
    ? [...DESK_LINKS, { to: '/admin', label: 'Admin', end: false }]
    : DESK_LINKS;
  return (
    <nav aria-label="Desks" className={`hidden items-center gap-space-lg lg:flex ${className}`}>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={desktopClass}
          onClick={link.to === '/' ? (event) => scrollHomeToTop(event, pathname) : undefined}
        >
          {link.label}
          {link.to === '/notifications' ? <RequestBadge count={unread} /> : null}
          {link.to === '/admin' ? <RequestBadge count={unseen} /> : null}
        </NavLink>
      ))}
    </nav>
  );
};

export const MobileTabBar = () => {
  const user = useSelector(selectUser);
  const { pathname } = useLocation();
  const unread = useUnreadCount();
  const unseen = useUnseenRequests();
  const links = user?.is_admin
    ? [...MOBILE_LINKS, { to: '/admin', label: 'Admin', end: false, Icon: AdminMark }]
    : MOBILE_LINKS;

  return (
    <nav
      aria-label="Desks"
      data-testid="mobile-tab-bar"
      className={`grid shrink-0 ${user?.is_admin ? 'grid-cols-5' : 'grid-cols-4'} border-t border-border bg-background pb-safe-bottom lg:hidden`}
    >
      {links.map((link) => {
        const Icon = link.Icon;
        const badge = link.to === '/notifications' ? unread : link.to === '/admin' ? unseen : 0;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={tabClass}
            onClick={link.to === '/' ? (event) => scrollHomeToTop(event, pathname) : undefined}
          >
            <span className="relative">
              {Icon ? <Icon className="h-6 w-6" /> : <NavPortrait user={user} />}
              {badge > 0 ? (
                <span className="absolute right-0 top-0 bg-secondary px-space-xs font-mono text-caption text-on-primary">
                  {badge > 99 ? '99' : badge}
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
