export function loggedTodayLabel(count) {
  const n = Number.isFinite(count) ? count : 0;
  return n === 1 ? '1 game logged today' : `${n} games logged today`;
}

export function editionDateline(timeZone) {
  const zone = timeZone || undefined;
  const date = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: zone,
  }).format(new Date());
  return date.toUpperCase();
}
