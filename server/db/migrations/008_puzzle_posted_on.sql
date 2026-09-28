-- Recompute played_on from each game's published puzzle day.
-- Size It Up #1 is 4 September 2026. Earlier rows used the upload day.

UPDATE scores s
SET played_on = CASE ga.slug
  WHEN 'krillion' THEN DATE '2026-07-16' + (s.puzzle_number - 1)
  WHEN 'map-tap' THEN DATE '2024-06-21' + s.puzzle_number
  WHEN 'wordle' THEN DATE '2021-06-19' + (s.puzzle_number - 1)
  WHEN 'size-it-up' THEN DATE '2026-09-04' + (s.puzzle_number - 1)
  ELSE s.played_on
END
FROM games ga
WHERE ga.game_id = s.game_id
  AND ga.slug IN ('krillion', 'map-tap', 'wordle', 'size-it-up');
