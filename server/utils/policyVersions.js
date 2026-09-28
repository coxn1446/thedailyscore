const CURRENT_TOS_VERSION = '2026-09-27';
const CURRENT_PRIVACY_VERSION = '2026-09-27';

const presentUser = (row) => {
  if (!row) return null;
  const { password, ...user } = row;
  const handle = typeof user.handle === 'string' && user.handle.trim() ? user.handle : null;
  return {
    ...user,
    handle,
    suspended: Boolean(user.suspended),
    has_password: Boolean(password) || Boolean(user.has_password),
    email_verified: Boolean(user.email_verified),
    needs_handle: !handle,
    needs_tos_acceptance: user.tos_accepted_version !== CURRENT_TOS_VERSION,
    needs_privacy_acceptance: user.privacy_accepted_version !== CURRENT_PRIVACY_VERSION,
    portrait_url: typeof user.portrait_url === 'string' && user.portrait_url.trim() ? user.portrait_url : null,
    dispatch_mode: user.dispatch_mode === 'auto' ? 'auto' : 'preview',
    remind_daily: user.remind_daily !== false && user.remind_daily !== 'f',
    alert_crown: user.alert_crown !== false && user.alert_crown !== 'f',
    alert_new_member: user.alert_new_member === true || user.alert_new_member === 't',
  };
};

const postAuthPath = (user) => (user && !user.needs_handle && user.handle ? '/' : '/register');

module.exports = {
  CURRENT_TOS_VERSION,
  CURRENT_PRIVACY_VERSION,
  presentUser,
  postAuthPath,
};
