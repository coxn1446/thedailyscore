-- Farflung: daily kilometres out of 500. Higher wins. #1 is 5 October 2026.
-- Eraly: daily points out of 700. Higher wins. #1 is 16 October 2026.
-- Existing groups get each row turned off until a curator enables it.

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, resets_at, sort_order, guess_cap)
VALUES
  ('farflung', 'Farflung', 'higher', 'score', 'daily', NULL, '00:00', 8, NULL),
  ('eraly', 'Eraly', 'higher', 'score', 'daily', NULL, '00:00', 9, NULL)
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
WHERE ga.slug IN ('farflung', 'eraly')
  AND NOT EXISTS (
    SELECT 1
    FROM group_games gg
    WHERE gg.group_id = g.group_id
      AND gg.game_id = ga.game_id
  );
