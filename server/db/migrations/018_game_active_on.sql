-- A game's attempt window starts the day it is turned on in the group.

ALTER TABLE group_games
  ADD COLUMN IF NOT EXISTS active_on DATE;

UPDATE group_games gg
SET active_on = (gg.updated_at AT TIME ZONE g.timezone)::date
FROM groups g
WHERE g.group_id = gg.group_id
  AND gg.enabled = TRUE
  AND gg.active_on IS NULL;
