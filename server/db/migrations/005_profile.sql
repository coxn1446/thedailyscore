-- Identity, dispatch, and stored reminder flags on the account.
-- Existing rows keep preview dispatch and the default reminder flags.

ALTER TABLE users ADD COLUMN IF NOT EXISTS portrait_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dispatch_mode VARCHAR(16) NOT NULL DEFAULT 'preview';
ALTER TABLE users ADD COLUMN IF NOT EXISTS remind_daily BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_crown BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS alert_new_member BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_dispatch_mode_check;
ALTER TABLE users ADD CONSTRAINT users_dispatch_mode_check
  CHECK (dispatch_mode IN ('preview', 'auto'));
