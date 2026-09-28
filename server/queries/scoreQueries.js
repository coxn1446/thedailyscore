const GAME_FIELDS = `
  game_id,
  slug,
  name,
  sort_direction,
  rank_basis,
  board,
  min_entries,
  resets_at,
  sort_order
`;

const findGameBySlug = `
  SELECT ${GAME_FIELDS}
  FROM games
  WHERE slug = $1
`;

const listDestinations = `
  SELECT g.group_id, g.name, g.timezone
  FROM group_members m
  JOIN groups g ON g.group_id = m.group_id
  JOIN group_games gg ON gg.group_id = g.group_id
  JOIN games ga ON ga.game_id = gg.game_id
  WHERE m.user_id = $1
    AND ga.slug = $2
    AND g.archived = FALSE
    AND gg.enabled = TRUE
  ORDER BY g.name ASC, g.group_id ASC
`;

const upsertScore = `
  INSERT INTO scores (
    user_id,
    game_id,
    puzzle_number,
    raw_paste,
    snippet,
    score,
    guesses,
    solved,
    played_on
  )
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date)
  ON CONFLICT (user_id, game_id, puzzle_number) DO NOTHING
  RETURNING
    score_id,
    user_id,
    game_id,
    puzzle_number,
    raw_paste,
    snippet,
    score,
    guesses,
    solved,
    created_at,
    updated_at
`;

const deletePublications = `
  DELETE FROM score_publications
  WHERE score_id = $1
`;

const insertPublication = `
  INSERT INTO score_publications (score_id, group_id)
  VALUES ($1, $2)
  ON CONFLICT (score_id, group_id) DO NOTHING
`;

// The score day starts at resets_at in the group timezone. Midnight when resets_at is 00:00.
const dayStart = (offsetExpr = '0') => `
  date_trunc('day', NOW() AT TIME ZONE g.timezone)
  + ga.resets_at
  - CASE
      WHEN (NOW() AT TIME ZONE g.timezone)::time < ga.resets_at THEN INTERVAL '1 day'
      ELSE INTERVAL '0'
    END
  - (${offsetExpr} * INTERVAL '1 day')
`;

const playedOn = `COALESCE(s.played_on, (s.created_at AT TIME ZONE g.timezone)::date)`;

const inDay = (offsetExpr = '0') => `
  ${playedOn} = (${dayStart(offsetExpr)})::date
`;

// Today's board: scores logged since resets_at in each group's timezone.
const listDailyBoard = `
  SELECT
    s.score_id,
    s.user_id,
    p.group_id,
    s.score AS value
  FROM score_publications p
  JOIN scores s ON s.score_id = p.score_id
  JOIN groups g ON g.group_id = p.group_id
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.game_id = $1
    AND p.group_id = ANY($2::int[])
    AND g.archived = FALSE
    AND s.score IS NOT NULL
    AND ${inDay('0')}
`;

// This prompt ranks Wordle by guess count among solved copies of the same puzzle.
const listPuzzleBoard = `
  SELECT
    s.score_id,
    s.user_id,
    p.group_id,
    s.guesses AS value
  FROM score_publications p
  JOIN scores s ON s.score_id = p.score_id
  WHERE s.game_id = $1
    AND s.puzzle_number = $2
    AND s.solved = TRUE
    AND s.guesses IS NOT NULL
    AND p.group_id = ANY($3::int[])
`;

// This week's publications. The week starts Monday 00:00 in the group timezone.
// logged_today uses resets_at in that timezone.
const listWeekRows = `
  SELECT
    p.group_id,
    ga.slug,
    ga.name,
    ga.sort_direction,
    ga.rank_basis,
    ga.board,
    ga.min_entries,
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.score,
    s.guesses,
    s.solved,
    s.snippet,
    u.handle,
    u.display_name,
    u.portrait_url,
    s.played_on,
    s.updated_at,
    (
      ${inDay('0')}
    ) AS logged_today,
    (
      ${playedOn} >= date_trunc('week', NOW() AT TIME ZONE g.timezone)::date
      AND ${playedOn} < date_trunc('week', NOW() AT TIME ZONE g.timezone)::date + 7
    ) AS logged_this_week
  FROM score_publications p
  JOIN scores s ON s.score_id = p.score_id
  JOIN groups g ON g.group_id = p.group_id
  JOIN games ga ON ga.game_id = s.game_id
  JOIN users u ON u.user_id = s.user_id
  JOIN group_games gg
    ON gg.group_id = p.group_id
   AND gg.game_id = ga.game_id
   AND gg.enabled = TRUE
  WHERE p.group_id = ANY($1::int[])
    AND g.archived = FALSE
`;

// One local day of one game. Offset 0 is the current score day; 1 is the day before.
const listDayBoard = `
  SELECT
    p.group_id,
    ga.slug,
    ga.name,
    ga.sort_direction,
    ga.rank_basis,
    ga.board,
    ga.min_entries,
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.score,
    s.guesses,
    s.solved,
    s.snippet,
    s.updated_at,
    u.handle,
    u.display_name
  FROM score_publications p
  JOIN scores s ON s.score_id = p.score_id
  JOIN groups g ON g.group_id = p.group_id
  JOIN games ga ON ga.game_id = s.game_id
  JOIN users u ON u.user_id = s.user_id
  JOIN group_games gg
    ON gg.group_id = p.group_id
   AND gg.game_id = ga.game_id
   AND gg.enabled = TRUE
  WHERE p.group_id = $1
    AND ga.slug = $2
    AND g.archived = FALSE
    AND ${inDay('$3::int')}
`;

const boardDate = `
  SELECT to_char((${dayStart('$3::int')})::date, 'YYYY-MM-DD') AS board_on
  FROM groups g
  JOIN games ga ON ga.slug = $2
  WHERE g.group_id = $1
`;

// Today's publications in the caller's groups. A disabled game stays visible only to its author.
const listGazette = `
  SELECT
    s.score_id,
    s.user_id,
    s.puzzle_number,
    s.score,
    s.guesses,
    s.solved,
    s.snippet,
    s.updated_at,
    ga.slug,
    ga.name AS game_name,
    ga.sort_direction,
    ga.rank_basis,
    u.handle,
    u.display_name,
    g.group_id,
    g.name AS group_name,
    gg.enabled
  FROM group_members viewer
  JOIN groups g ON g.group_id = viewer.group_id
  JOIN score_publications p ON p.group_id = g.group_id
  JOIN scores s ON s.score_id = p.score_id
  JOIN games ga ON ga.game_id = s.game_id
  JOIN users u ON u.user_id = s.user_id
  JOIN group_games gg
    ON gg.group_id = g.group_id
   AND gg.game_id = ga.game_id
  WHERE viewer.user_id = $1
    AND g.archived = FALSE
    AND (gg.enabled = TRUE OR s.user_id = $1)
    AND ${inDay('0')}
  ORDER BY s.updated_at DESC, s.score_id DESC, g.name ASC
`;

// The caller's own results since midnight in their timezone.
const countLoggedToday = `
  SELECT COUNT(*)::int AS count
  FROM scores s
  JOIN users u ON u.user_id = s.user_id
  WHERE s.user_id = $1
    AND (s.updated_at AT TIME ZONE u.timezone) >= date_trunc('day', NOW() AT TIME ZONE u.timezone)
    AND (s.updated_at AT TIME ZONE u.timezone)
      < date_trunc('day', NOW() AT TIME ZONE u.timezone) + INTERVAL '1 day'
`;

const listPersonalBests = `
  SELECT
    ga.slug,
    ga.name,
    ga.rank_basis,
    ga.sort_order,
    best.score AS best_score,
    best.guesses AS best_guesses,
    best.attained_at
  FROM games ga
  LEFT JOIN LATERAL (
    SELECT s.score, s.guesses, s.updated_at AS attained_at
    FROM scores s
    WHERE s.game_id = ga.game_id
      AND s.user_id = $1
      AND (
        (ga.rank_basis = 'score' AND s.score IS NOT NULL)
        OR (ga.rank_basis = 'guesses' AND s.solved = TRUE AND s.guesses IS NOT NULL)
      )
    ORDER BY
      CASE WHEN ga.rank_basis = 'score' THEN s.score END DESC NULLS LAST,
      CASE WHEN ga.rank_basis = 'guesses' THEN s.guesses END ASC NULLS LAST,
      s.updated_at ASC
    LIMIT 1
  ) best ON TRUE
  ORDER BY ga.sort_order ASC, ga.game_id ASC
`;

const listArchive = `
  SELECT
    s.score_id,
    s.puzzle_number,
    s.score,
    s.guesses,
    s.solved,
    s.created_at,
    ga.slug,
    ga.name,
    ga.rank_basis
  FROM scores s
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.user_id = $1
  ORDER BY s.created_at DESC, s.score_id DESC
`;

const listArchivePublications = `
  SELECT p.score_id, g.group_id, g.name
  FROM score_publications p
  JOIN scores s ON s.score_id = p.score_id
  JOIN groups g ON g.group_id = p.group_id
  WHERE s.user_id = $1
  ORDER BY g.name ASC, g.group_id ASC
`;

const listShareableGroups = `
  SELECT ga.slug, g.group_id, g.name
  FROM group_members m
  JOIN groups g ON g.group_id = m.group_id
  JOIN group_games gg ON gg.group_id = g.group_id AND gg.enabled = TRUE
  JOIN games ga ON ga.game_id = gg.game_id
  WHERE m.user_id = $1
    AND g.archived = FALSE
  ORDER BY g.name ASC, g.group_id ASC
`;

const findOwnedScore = `
  SELECT s.score_id, ga.slug
  FROM scores s
  JOIN games ga ON ga.game_id = s.game_id
  WHERE s.score_id = $1
    AND s.user_id = $2
`;

const deleteOwnedScore = `
  DELETE FROM scores
  WHERE score_id = $1
    AND user_id = $2
  RETURNING score_id
`;

module.exports = {
  findGameBySlug,
  listDestinations,
  upsertScore,
  deletePublications,
  insertPublication,
  listDailyBoard,
  listPuzzleBoard,
  listWeekRows,
  listDayBoard,
  boardDate,
  listGazette,
  countLoggedToday,
  listPersonalBests,
  listArchive,
  listArchivePublications,
  listShareableGroups,
  findOwnedScore,
  deleteOwnedScore,
};
