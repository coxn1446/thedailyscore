-- Friend requests. A pair is unique in the direction it was sent.
-- The other direction of a pending request is accepted in the service.

CREATE TABLE IF NOT EXISTS friendships (
  friendship_id SERIAL PRIMARY KEY,
  requester_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  addressee_id INTEGER NOT NULL REFERENCES users (user_id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT friendships_distinct CHECK (requester_id <> addressee_id),
  CONSTRAINT friendships_status_check CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT friendships_pair_uidx UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON friendships (addressee_id, status);
CREATE INDEX IF NOT EXISTS friendships_requester_idx ON friendships (requester_id, status);

DROP TRIGGER IF EXISTS friendships_set_updated_at ON friendships;
CREATE TRIGGER friendships_set_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
