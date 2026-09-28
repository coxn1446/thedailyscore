-- The puzzle's calendar day, not the moment it was pasted.

ALTER TABLE scores ADD COLUMN IF NOT EXISTS played_on DATE;

UPDATE scores s
SET played_on = CASE ga.slug
  WHEN 'krillion' THEN DATE '2026-07-16' + (s.puzzle_number - 1)
  WHEN 'map-tap' THEN DATE '2024-06-21' + s.puzzle_number
  WHEN 'wordle' THEN DATE '2021-06-19' + (s.puzzle_number - 1)
  ELSE (s.created_at AT TIME ZONE 'UTC')::date
END
FROM games ga
WHERE ga.game_id = s.game_id
  AND s.played_on IS NULL;

ALTER TABLE scores ALTER COLUMN played_on SET NOT NULL;
