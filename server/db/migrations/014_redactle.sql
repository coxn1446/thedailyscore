-- Redactle: uncapped guesses, plus time and hints on each result.
-- Wordle keeps a guess cap of 6. A give-up may store its guess count.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS guess_cap INTEGER;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_guess_cap_check;
ALTER TABLE games
  ADD CONSTRAINT games_guess_cap_check CHECK (guess_cap IS NULL OR guess_cap > 0);

UPDATE games
SET guess_cap = 6
WHERE slug = 'wordle';

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, resets_at, sort_order, guess_cap)
VALUES ('redactle', 'Redactle', 'lower', 'guesses', 'daily', NULL, '00:00', 5, NULL)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_direction = EXCLUDED.sort_direction,
  rank_basis = EXCLUDED.rank_basis,
  board = EXCLUDED.board,
  min_entries = EXCLUDED.min_entries,
  resets_at = EXCLUDED.resets_at,
  sort_order = EXCLUDED.sort_order,
  guess_cap = EXCLUDED.guess_cap;

INSERT INTO group_games (group_id, game_id, enabled)
SELECT g.group_id, ga.game_id, FALSE
FROM groups g
CROSS JOIN games ga
WHERE ga.slug = 'redactle'
  AND NOT EXISTS (
    SELECT 1
    FROM group_games gg
    WHERE gg.group_id = g.group_id
      AND gg.game_id = ga.game_id
  );

ALTER TABLE scores
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS hints INTEGER;

ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_guesses_check;
ALTER TABLE scores
  ADD CONSTRAINT scores_guesses_check CHECK (guesses IS NULL OR (guesses >= 1 AND guesses <= 9999));

ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_duration_check;
ALTER TABLE scores
  ADD CONSTRAINT scores_duration_check CHECK (duration_seconds IS NULL OR duration_seconds >= 0);

ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_hints_check;
ALTER TABLE scores
  ADD CONSTRAINT scores_hints_check CHECK (hints IS NULL OR hints >= 0);

ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_value_check;
ALTER TABLE scores
  ADD CONSTRAINT scores_value_check CHECK (
    (score IS NOT NULL AND guesses IS NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NOT NULL AND solved = TRUE)
    OR (score IS NULL AND guesses IS NULL AND solved = FALSE)
    OR (score IS NULL AND guesses IS NOT NULL AND solved = FALSE)
  );
