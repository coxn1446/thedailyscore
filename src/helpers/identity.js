export function needsHandle(user) {
  return Boolean(user) && !user.handle;
}

export function clientTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
