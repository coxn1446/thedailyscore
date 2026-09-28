const USER_FIELDS = `
  user_id,
  email,
  handle,
  google_id,
  apple_id,
  display_name,
  timezone,
  portrait_url,
  dispatch_mode,
  remind_daily,
  alert_crown,
  alert_new_member,
  suspended,
  tos_accepted_version,
  privacy_accepted_version,
  email_verified,
  (password IS NOT NULL) AS has_password,
  created_at,
  updated_at
`;

const findById = `
  SELECT ${USER_FIELDS}
  FROM users
  WHERE user_id = $1
`;

const findByEmail = `
  SELECT ${USER_FIELDS}, password
  FROM users
  WHERE LOWER(email) = LOWER($1)
`;

const findByHandle = `
  SELECT ${USER_FIELDS}, password
  FROM users
  WHERE handle = LOWER($1)
`;

const findByIdentifier = `
  SELECT ${USER_FIELDS}, password
  FROM users
  WHERE LOWER(email) = LOWER($1) OR handle = LOWER($1)
`;

const findByGoogleId = `
  SELECT ${USER_FIELDS}
  FROM users
  WHERE google_id = $1
`;

const findByAppleId = `
  SELECT ${USER_FIELDS}
  FROM users
  WHERE apple_id = $1
`;

const insertLocalUser = `
  INSERT INTO users (
    email,
    handle,
    password,
    display_name,
    timezone,
    tos_accepted_version,
    privacy_accepted_version
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING ${USER_FIELDS}
`;

const insertOAuthUser = `
  INSERT INTO users (
    email,
    google_id,
    apple_id,
    display_name,
    email_verified
  )
  VALUES ($1, $2, $3, $4, TRUE)
  RETURNING ${USER_FIELDS}
`;

const linkGoogleId = `
  UPDATE users
  SET
    google_id = $2,
    email_verified = TRUE,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const linkAppleId = `
  UPDATE users
  SET
    apple_id = $2,
    email_verified = TRUE,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const setHandle = `
  UPDATE users
  SET
    handle = $2,
    timezone = $3,
    display_name = COALESCE($4, display_name),
    tos_accepted_version = $5,
    privacy_accepted_version = $6,
    updated_at = NOW()
  WHERE user_id = $1
    AND handle IS NULL
  RETURNING ${USER_FIELDS}
`;

const setPassword = `
  UPDATE users
  SET password = $2, updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const setVerifyToken = `
  UPDATE users
  SET
    email_verify_token_hash = $2,
    email_verify_expires_at = $3,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const findByVerifyTokenHash = `
  SELECT ${USER_FIELDS}
  FROM users
  WHERE email_verify_token_hash = $1
    AND email_verify_expires_at > NOW()
`;

const markEmailVerified = `
  UPDATE users
  SET
    email_verified = TRUE,
    email_verify_token_hash = NULL,
    email_verify_expires_at = NULL,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const setResetToken = `
  UPDATE users
  SET
    password_reset_token_hash = $2,
    password_reset_expires_at = $3,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

const findByResetTokenHash = `
  SELECT ${USER_FIELDS}, password
  FROM users
  WHERE password_reset_token_hash = $1
    AND password_reset_expires_at > NOW()
`;

const setPasswordAndClearReset = `
  UPDATE users
  SET
    password = $2,
    password_reset_token_hash = NULL,
    password_reset_expires_at = NULL,
    updated_at = NOW()
  WHERE user_id = $1
  RETURNING ${USER_FIELDS}
`;

module.exports = {
  USER_FIELDS,
  findById,
  findByEmail,
  findByHandle,
  findByIdentifier,
  findByGoogleId,
  findByAppleId,
  insertLocalUser,
  insertOAuthUser,
  linkGoogleId,
  linkAppleId,
  setHandle,
  setPassword,
  setVerifyToken,
  findByVerifyTokenHash,
  markEmailVerified,
  setResetToken,
  findByResetTokenHash,
  setPasswordAndClearReset,
};
