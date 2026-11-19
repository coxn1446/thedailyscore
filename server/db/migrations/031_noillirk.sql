-- Noillirk: daily altitude in metres. Higher wins.
-- Daily #1 is 27 September 2026. Existing groups get the row turned off until a curator enables it.

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, resets_at, sort_order, guess_cap)
VALUES
  ('noillirk', 'Noillirk', 'higher', 'score', 'daily', NULL, '00:00', 12, NULL)
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
WHERE ga.slug = 'noillirk'
  AND NOT EXISTS (
    SELECT 1
    FROM group_games gg
    WHERE gg.group_id = g.group_id
      AND gg.game_id = ga.game_id
  );
