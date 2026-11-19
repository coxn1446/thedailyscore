-- One account switch for every push: scores, parlor, crown, reminders, and new members.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS notifications BOOLEAN NOT NULL DEFAULT TRUE;
