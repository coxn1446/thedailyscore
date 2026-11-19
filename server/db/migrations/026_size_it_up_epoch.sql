-- Size It Up #100 is 17 November 2026, so #1 is 10 August 2026.
-- A Magnitudle card and a dateless paste store the day as YYYYMMDD and keep that played_on.

UPDATE scores s
SET played_on = DATE '2026-08-10' + (s.puzzle_number - 1)
FROM games ga
WHERE ga.game_id = s.game_id
  AND ga.slug = 'size-it-up'
  AND s.puzzle_number < 100000;
