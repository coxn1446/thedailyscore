-- Initial users table for greenfield and incremental migrate.

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  handle VARCHAR(24) UNIQUE,
  password VARCHAR(255),
  google_id VARCHAR(255),
  apple_id VARCHAR(255),
  display_name VARCHAR(80),
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  suspended BOOLEAN NOT NULL DEFAULT FALSE,
  tos_accepted_version VARCHAR(32),
  privacy_accepted_version VARCHAR(32),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  email_verify_token_hash VARCHAR(64),
  email_verify_expires_at TIMESTAMPTZ,
  password_reset_token_hash VARCHAR(64),
  password_reset_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_handle_format CHECK (
    handle IS NULL OR handle ~ '^[a-z0-9_]{3,24}$'
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_uidx
  ON users (google_id)
  WHERE google_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_uidx
  ON users (apple_id)
  WHERE apple_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_verify_token_hash_uidx
  ON users (email_verify_token_hash)
  WHERE email_verify_token_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_password_reset_token_hash_uidx
  ON users (password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_handle_idx ON users (handle);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
