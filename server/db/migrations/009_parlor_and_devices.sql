-- One parlor per group, and the device token used for FCM.

CREATE TABLE IF NOT EXISTS parlors (
  parlor_id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL UNIQUE REFERENCES groups (group_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO parlors (group_id)
SELECT g.group_id
FROM groups g
WHERE NOT EXISTS (
  SELECT 1 FROM parlors p WHERE p.group_id = g.group_id
);

CREATE TABLE IF NOT EXISTS parlor_messages (
  message_id SERIAL PRIMARY KEY,
  parlor_id INTEGER NOT NULL REFERENCES parlors (parlor_id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT parlor_messages_body_check CHECK (char_length(body) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS parlor_messages_parlor_idx
  ON parlor_messages (parlor_id, message_id DESC);

CREATE TABLE IF NOT EXISTS device_tokens (
  device_token_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT device_tokens_platform_check CHECK (platform IN ('ios', 'android', 'web'))
);

CREATE INDEX IF NOT EXISTS device_tokens_user_idx ON device_tokens (user_id);

DROP TRIGGER IF EXISTS device_tokens_set_updated_at ON device_tokens;
CREATE TRIGGER device_tokens_set_updated_at
  BEFORE UPDATE ON device_tokens
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
