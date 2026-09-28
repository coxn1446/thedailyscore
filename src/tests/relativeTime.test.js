import { loggedTodayLabel } from '../utils/edition';
import { formatBoardDay, relativeTime } from '../utils/relativeTime';

describe('relative time', () => {
  const now = new Date('2026-09-27T18:00:00.000Z');

  test('formats a recent log and a board date', () => {
    expect(relativeTime('2026-09-27T17:55:00.000Z', now)).toBe('5m ago');
    expect(relativeTime('2026-09-27T13:00:00.000Z', now)).toBe('5h ago');
    expect(relativeTime('', now)).toBe('');
    expect(formatBoardDay('2026-09-26')).toBe('September 26');
    expect(formatBoardDay('')).toBe('Earlier');
  });
});

describe('logged today label', () => {
  test('pluralizes the masthead count', () => {
    expect(loggedTodayLabel(0)).toBe('0 games logged today');
    expect(loggedTodayLabel(1)).toBe('1 game logged today');
    expect(loggedTodayLabel(2)).toBe('2 games logged today');
  });
});
