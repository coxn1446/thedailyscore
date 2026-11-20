const { query } = require('../db');
const groupQueries = require('../queries/groupQueries');
const profileQueries = require('../queries/profileQueries');

const slugOrder = async (userId) => {
  const catalog = await query(groupQueries.listGames);
  const prefs = userId ? await query(profileQueries.listUserGames, [userId]) : { rows: [] };
  const pref = new Map(prefs.rows.map((row) => [row.slug, row.sort_order]));
  return [...catalog.rows]
    .map((game, index) => {
      const custom = pref.has(game.slug) ? pref.get(game.slug) : null;
      const sort = custom == null || custom === '' ? Number(game.sort_order) : Number(custom);
      return { slug: game.slug, sort: Number.isNaN(sort) ? index : sort, index };
    })
    .sort((a, b) => a.sort - b.sort || a.index - b.index)
    .map((game) => game.slug);
};

const sortWith = (items, slugs, slugOf) => {
  const rank = new Map((slugs || []).map((slug, index) => [slug, index]));
  const last = slugs?.length || 0;
  return [...(items || [])].sort(
    (a, b) => (rank.get(slugOf(a)) ?? last) - (rank.get(slugOf(b)) ?? last)
  );
};

module.exports = { slugOrder, sortWith };
