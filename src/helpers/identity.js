export function needsHandle(user) {
  return Boolean(user) && !user.handle;
}

export function needsPolicy(user) {
  return Boolean(user) && (user.needs_tos_acceptance === true || user.needs_privacy_acceptance === true);
}

export function clientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
