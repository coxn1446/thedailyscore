-- Store the FCM registration token beside the APNs device token.
-- Rows that only have an APNs token cannot be sent through Firebase Admin.

ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS fcm_token TEXT;

DELETE FROM device_tokens
WHERE fcm_token IS NULL OR btrim(fcm_token) = '';

ALTER TABLE device_tokens ALTER COLUMN fcm_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS device_tokens_fcm_token_key ON device_tokens (fcm_token);
