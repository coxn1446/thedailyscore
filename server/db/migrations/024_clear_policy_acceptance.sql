-- The Terms and Privacy Policy changed. Existing accounts accept the current versions on the next sign-in.

UPDATE users
SET
  tos_accepted_version = NULL,
  privacy_accepted_version = NULL,
  updated_at = NOW();
