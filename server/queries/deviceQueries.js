const upsertToken = `
  INSERT INTO device_tokens (user_id, token, platform)
  VALUES ($1, $2, $3)
  ON CONFLICT (token) DO UPDATE
  SET user_id = EXCLUDED.user_id,
      platform = EXCLUDED.platform,
      updated_at = NOW()
  RETURNING device_token_id, user_id, token, platform
`;

const deleteToken = `
  DELETE FROM device_tokens
  WHERE user_id = $1 AND token = $2
  RETURNING token
`;

const deleteTokens = `
  DELETE FROM device_tokens
  WHERE token = ANY($1::text[])
`;

module.exports = {
  upsertToken,
  deleteToken,
  deleteTokens,
};
