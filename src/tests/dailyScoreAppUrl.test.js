import { pathFromIncomingAppUrl } from '../utils/dailyScoreAppUrl';

describe('incoming app urls', () => {
  test('keeps the custom scheme and opens site links inside the app', () => {
    expect(pathFromIncomingAppUrl('Thedailyscore://thedailyscore.com/groups/3?game=wordle')).toBe('/groups/3?game=wordle');
    expect(pathFromIncomingAppUrl('https://thedailyscore.site/groups/3?game=wordle')).toBe('/groups/3?game=wordle');
    expect(pathFromIncomingAppUrl('https://qa.thedailyscore.site/join/abc')).toBe('/join/abc');
    expect(pathFromIncomingAppUrl('https://thedailyscore.site/api/scores')).toBeNull();
    expect(pathFromIncomingAppUrl('https://example.com/groups/3')).toBeNull();
  });
});
