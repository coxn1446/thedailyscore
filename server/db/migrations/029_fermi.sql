-- Fermi: daily geometric mean of three multiples, each capped at 1,000×. Lower wins.
-- #1 is 27 July 2026. The score column becomes numeric so 27.6 and 1.94 can be stored.
-- Existing groups get the row turned off until a curator enables it.

ALTER TABLE scores
  ALTER COLUMN score TYPE NUMERIC(12, 2) USING score::numeric;

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, resets_at, sort_order, guess_cap)
VALUES
  ('fermi', 'Fermi', 'lower', 'score', 'daily', NULL, '00:00', 10, NULL)
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
WHERE ga.slug = 'fermi'
  AND NOT EXISTS (
    SELECT 1
    FROM group_games gg
    WHERE gg.group_id = g.group_id
      AND gg.game_id = ga.game_id
  );
