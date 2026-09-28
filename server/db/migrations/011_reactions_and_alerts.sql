-- Group-level notification flags, and one reaction per member per parlor message.

ALTER TABLE group_members ADD COLUMN IF NOT EXISTS alert_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE group_members ADD COLUMN IF NOT EXISTS alert_scores BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS parlor_reactions (
  message_id INTEGER NOT NULL REFERENCES parlor_messages (message_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  kind VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id),
  CONSTRAINT parlor_reactions_kind_check CHECK (
    kind IN ('heart', 'up', 'down', 'haha', 'exclaim', 'question')
  )
);

CREATE INDEX IF NOT EXISTS parlor_reactions_message_idx ON parlor_reactions (message_id);
