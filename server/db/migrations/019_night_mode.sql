-- Account switch for the ink edition. Off keeps the paper edition.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS night_mode BOOLEAN NOT NULL DEFAULT FALSE;
