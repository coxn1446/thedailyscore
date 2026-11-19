const KEY = 'ds:account-deleted';

export const markAccountDeleted = () => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    /* private mode */
  }
};

export const consumeAccountDeleted = () => {
  try {
    const deleted = sessionStorage.getItem(KEY) === '1';
    if (deleted) sessionStorage.removeItem(KEY);
    return deleted;
  } catch {
    return false;
  }
};

export const peekAccountDeleted = () => {
  try {
    return sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

export const signedOutLoginTarget = (pathname, search = '') => {
  if (peekAccountDeleted()) {
    return { to: '/login', state: { accountDeleted: true } };
  }
  const next = encodeURIComponent(`${pathname || '/'}${search || ''}`);
  return { to: `/login?next=${next}`, state: null };
};
