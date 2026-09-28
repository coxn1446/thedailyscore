-- Narrow the catalog to the four MVP games and record how each board ranks.
-- Score games: highest score wins, daily board, resets at midnight.
-- Guess games: lowest guesses win, weekly average, minimum submissions to qualify.

ALTER TABLE games
  ADD COLUMN IF NOT EXISTS rank_basis VARCHAR(16),
  ADD COLUMN IF NOT EXISTS board VARCHAR(16),
  ADD COLUMN IF NOT EXISTS min_entries INTEGER,
  ADD COLUMN IF NOT EXISTS resets_at TIME;

UPDATE games
SET
  rank_basis = COALESCE(rank_basis, 'score'),
  board = COALESCE(board, 'daily'),
  resets_at = COALESCE(resets_at, '00:00')
WHERE rank_basis IS NULL OR board IS NULL OR resets_at IS NULL;

ALTER TABLE games ALTER COLUMN rank_basis SET NOT NULL;
ALTER TABLE games ALTER COLUMN board SET NOT NULL;
ALTER TABLE games ALTER COLUMN resets_at SET DEFAULT '00:00';
ALTER TABLE games ALTER COLUMN resets_at SET NOT NULL;

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_rank_basis_check;
ALTER TABLE games ADD CONSTRAINT games_rank_basis_check CHECK (rank_basis IN ('score', 'guesses'));

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_board_check;
ALTER TABLE games ADD CONSTRAINT games_board_check CHECK (board IN ('daily', 'weekly'));

ALTER TABLE games DROP CONSTRAINT IF EXISTS games_min_entries_check;
ALTER TABLE games ADD CONSTRAINT games_min_entries_check CHECK (min_entries IS NULL OR min_entries > 0);

DELETE FROM group_games
WHERE game_id IN (
  SELECT game_id FROM games
  WHERE slug NOT IN ('map-tap', 'krillion', 'size-it-up', 'wordle')
);

DELETE FROM games
WHERE slug NOT IN ('map-tap', 'krillion', 'size-it-up', 'wordle');

UPDATE games
SET
  name = 'Map Tap',
  sort_direction = 'higher',
  rank_basis = 'score',
  board = 'daily',
  min_entries = NULL,
  resets_at = '00:00',
  sort_order = 1
WHERE slug = 'map-tap';

UPDATE games
SET
  name = 'Krillion',
  sort_direction = 'higher',
  rank_basis = 'score',
  board = 'daily',
  min_entries = NULL,
  resets_at = '00:00',
  sort_order = 2
WHERE slug = 'krillion';

INSERT INTO games (slug, name, sort_direction, rank_basis, board, min_entries, resets_at, sort_order)
VALUES ('size-it-up', 'Size it Up', 'higher', 'score', 'daily', NULL, '00:00', 3)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  sort_direction = EXCLUDED.sort_direction,
  rank_basis = EXCLUDED.rank_basis,
  board = EXCLUDED.board,
  min_entries = EXCLUDED.min_entries,
  resets_at = EXCLUDED.resets_at,
  sort_order = EXCLUDED.sort_order;

UPDATE games
SET
  name = 'Wordle',
  sort_direction = 'lower',
  rank_basis = 'guesses',
  board = 'weekly',
  min_entries = 4,
  resets_at = '00:00',
  sort_order = 4
WHERE slug = 'wordle';

INSERT INTO group_games (group_id, game_id, enabled)
SELECT g.group_id, ga.game_id, FALSE
FROM groups g
CROSS JOIN games ga
WHERE NOT EXISTS (
  SELECT 1
  FROM group_games gg
  WHERE gg.group_id = g.group_id
    AND gg.game_id = ga.game_id
);
