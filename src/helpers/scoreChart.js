const dayOf = (row) => {
  if (typeof row?.played_on === 'string' && /^\d{4}-\d{2}-\d{2}/.test(row.played_on)) {
    return row.played_on.slice(0, 10);
  }
  if (typeof row?.logged_at === 'string' && /^\d{4}-\d{2}-\d{2}/.test(row.logged_at)) {
    return row.logged_at.slice(0, 10);
  }
  return '';
};

const stampOf = (iso) => Date.parse(`${iso}T00:00:00Z`);

export const chartValue = (row) => {
  const basis = row?.game?.rank_basis || row?.rank_basis;
  if (basis === 'guesses') {
    if (row.guesses == null || Number.isNaN(Number(row.guesses))) return null;
    return Number(row.guesses);
  }
  if (row?.score == null || Number.isNaN(Number(row.score))) return null;
  return Number(row.score);
};

const formatValue = (row, value) => {
  const basis = row?.game?.rank_basis || row?.rank_basis;
  const cap = row?.game?.guess_cap;
  if (basis === 'guesses') {
    if (row.solved === false) return cap ? `X/${cap}` : 'X';
    return cap ? `${value}/${cap}` : String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export const buildScoreLines = (scores) => {
  const rows = (Array.isArray(scores) ? scores : [])
    .map((row) => ({ row, on: dayOf(row), value: chartValue(row) }))
    .filter((item) => item.on && item.value != null);
  if (!rows.length) return { series: [], start: '', end: '' };

  const stamps = rows.map((item) => stampOf(item.on));
  const minStamp = Math.min(...stamps);
  const maxStamp = Math.max(...stamps);
  const span = maxStamp - minStamp;
  const xOf = (iso) => (span === 0 ? 0.5 : (stampOf(iso) - minStamp) / span);

  const bySlug = new Map();
  for (const item of rows) {
    const slug = item.row.game?.slug || item.row.slug;
    const list = bySlug.get(slug) || [];
    list.push(item);
    bySlug.set(slug, list);
  }

  const series = [...bySlug.entries()].map(([slug, list]) => {
    const values = list.map((item) => item.value);
    const low = Math.min(...values);
    const high = Math.max(...values);
    const height = high - low;
    const sample = list[0].row;
    return {
      slug,
      name: sample.game?.name || sample.name || slug,
      low,
      high,
      points: list
        .map((item) => ({
          scoreId: item.row.score_id,
          on: item.on,
          value: item.value,
          label: formatValue(item.row, item.value),
          puzzle: item.row.puzzle_number,
          name: sample.game?.name || sample.name || slug,
          x: xOf(item.on),
          y: height === 0 ? 0.5 : (item.value - low) / height,
        }))
        .sort((a, b) => a.on.localeCompare(b.on) || a.scoreId - b.scoreId),
    };
  });

  const dates = rows.map((item) => item.on).sort();
  return { series, start: dates[0], end: dates[dates.length - 1] };
};
