const insertRequest = `
  INSERT INTO game_requests (user_id, game_name, note)
  VALUES ($1, $2, $3)
  RETURNING request_id, user_id, game_name, note, created_at
`;

module.exports = {
  insertRequest,
};
