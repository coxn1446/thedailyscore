-- Per-member parlor read cursor. Unread messages are newer than this id and from someone else.

CREATE TABLE IF NOT EXISTS parlor_reads (
  user_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES groups (group_id) ON DELETE CASCADE,
  last_read_message_id INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, group_id)
);

DROP TRIGGER IF EXISTS parlor_reads_set_updated_at ON parlor_reads;
CREATE TRIGGER parlor_reads_set_updated_at
  BEFORE UPDATE ON parlor_reads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
