jest.mock('../../server/db', () => ({
  isDbHealthy: jest.fn(),
  query: jest.fn(),
  withTransaction: jest.fn(async (fn) => fn({ query: require('../../server/db').query })),
}));

const { isDbHealthy, query } = require('../../server/db');
const scoreQueries = require('../../server/queries/scoreQueries');
const scoreService = require('../../server/services/scoreService');

describe('score archive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isDbHealthy.mockReturnValue(true);
    query.mockImplementation(async (sql) => {
      if (sql === scoreQueries.listArchive) {
        return {
          rows: [
            {
              score_id: 9,
              puzzle_number: 80,
              score: 210,
              guesses: null,
              solved: true,
              created_at: '2026-09-27T15:00:00.000Z',
              slug: 'krillion',
              name: 'Krillion',
              rank_basis: 'score',
            },
            {
              score_id: 3,
              puzzle_number: 1,
              score: 100,
              guesses: null,
              solved: true,
              created_at: '2026-09-26T15:00:00.000Z',
              slug: 'krillion',
              name: 'Krillion',
              rank_basis: 'score',
            },
          ],
        };
      }
      if (sql === scoreQueries.listArchivePublications) {
        return { rows: [{ score_id: 9, group_id: 4, name: 'Monday desk' }] };
      }
      if (sql === scoreQueries.listShareableGroups) {
        return { rows: [{ slug: 'krillion', group_id: 4, name: 'Monday desk' }] };
      }
      if (sql === scoreQueries.findOwnedScore) {
        return { rows: [] };
      }
      if (sql === scoreQueries.deleteOwnedScore) {
        return { rows: [] };
      }
      throw new Error(`unexpected sql ${String(sql).slice(0, 40)}`);
    });
  });

  test('returns only the caller’s filed scores', async () => {
    const payload = await scoreService.archive(4);
    expect(payload.scores.map((row) => row.score_id)).toEqual([9, 3]);
    expect(payload.scores[0].groups).toEqual([{ group_id: 4, name: 'Monday desk' }]);
    expect(payload.scores[1].groups).toEqual([]);
    expect(query).toHaveBeenCalledWith(scoreQueries.listArchive, [4]);
  });

  test('refuses to delete another reader’s score', async () => {
    await expect(scoreService.removeScore(4, 3)).rejects.toMatchObject({
      status: 404,
      message: 'Score not found',
    });
  });
});
