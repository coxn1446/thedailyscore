-- A comment can carry a picture. The note can be empty when a picture is attached.

ALTER TABLE score_comments
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE score_comments DROP CONSTRAINT IF EXISTS score_comments_body_check;

ALTER TABLE score_comments
  ADD CONSTRAINT score_comments_body_check CHECK (
    char_length(btrim(body)) <= 500
    AND (char_length(btrim(body)) >= 1 OR image_url IS NOT NULL)
  );
