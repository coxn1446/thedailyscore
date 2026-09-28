-- A parlor conversation is one group and one game. It stays hidden until the member posts that game today.

ALTER TABLE parlor_messages ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games (game_id);
DELETE FROM parlor_messages WHERE game_id IS NULL;
ALTER TABLE parlor_messages ALTER COLUMN game_id SET NOT NULL;

DROP INDEX IF EXISTS parlor_messages_parlor_idx;
CREATE INDEX IF NOT EXISTS parlor_messages_game_idx
  ON parlor_messages (parlor_id, game_id, message_id DESC);

ALTER TABLE parlor_reads DROP CONSTRAINT IF EXISTS parlor_reads_pkey;
ALTER TABLE parlor_reads ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games (game_id);
DELETE FROM parlor_reads WHERE game_id IS NULL;
ALTER TABLE parlor_reads ALTER COLUMN game_id SET NOT NULL;
ALTER TABLE parlor_reads DROP CONSTRAINT IF EXISTS parlor_reads_pkey;
ALTER TABLE parlor_reads ADD PRIMARY KEY (user_id, group_id, game_id);
