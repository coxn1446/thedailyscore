-- A standings note is one parlor message per group, game, and puzzle day.
-- Chat messages stay kind 'chat'.

ALTER TABLE parlor_messages
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'chat';

ALTER TABLE parlor_messages DROP CONSTRAINT IF EXISTS parlor_messages_kind_check;
ALTER TABLE parlor_messages
  ADD CONSTRAINT parlor_messages_kind_check CHECK (kind IN ('chat', 'standings'));
