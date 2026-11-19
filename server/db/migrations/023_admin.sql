-- Admins see game requests. Handle will is the first admin.
-- A request stays unseen until an admin opens that desk.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET is_admin = TRUE
WHERE handle = 'will';

ALTER TABLE game_requests
  ADD COLUMN IF NOT EXISTS seen BOOLEAN NOT NULL DEFAULT FALSE;
