import { buildScoreLines } from '../helpers/scoreChart';

const score = (overrides) => ({
  score_id: 1,
  puzzle_number: 1,
  score: 100,
  guesses: null,
  solved: true,
  played_on: '2026-11-01',
  game: { slug: 'krillion', name: 'Krillion', rank_basis: 'score' },
  ...overrides,
});

describe('score chart', () => {
  test('scales each game from its low score to its high score across the dates', () => {
    const chart = buildScoreLines([
      score({ score_id: 1, score: 100, played_on: '2026-11-01' }),
      score({ score_id: 2, score: 300, played_on: '2026-11-03' }),
      score({
        score_id: 3,
        score: null,
        guesses: 2,
        played_on: '2026-11-01',
        puzzle_number: 10,
        game: { slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', guess_cap: 6 },
      }),
      score({
        score_id: 4,
        score: null,
        guesses: 6,
        played_on: '2026-11-03',
        puzzle_number: 12,
        game: { slug: 'wordle', name: 'Wordle', rank_basis: 'guesses', guess_cap: 6 },
      }),
    ]);

    const krillion = chart.series.find((series) => series.slug === 'krillion');
    const wordle = chart.series.find((series) => series.slug === 'wordle');
    expect(chart.start).toBe('2026-11-01');
    expect(chart.end).toBe('2026-11-03');
    expect(krillion.points.map((point) => point.y)).toEqual([0, 1]);
    expect(wordle.points.map((point) => point.y)).toEqual([0, 1]);
    expect(wordle.points[1].label).toBe('6/6');
    expect(krillion.points[0].x).toBe(0);
    expect(krillion.points[1].x).toBe(1);
  });
});