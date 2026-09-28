export const ordinal = (rank) => {
  const number = Number(rank);
  if (!Number.isInteger(number) || number <= 0) return '—';
  const mod100 = number % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${number}th`;
  if (number % 10 === 1) return `${number}st`;
  if (number % 10 === 2) return `${number}nd`;
  if (number % 10 === 3) return `${number}rd`;
  return `${number}th`;
};

export const periodDays = (period, createdAt, from, to) => {
  if (period === 'week') return 7;
  if (period === 'custom') {
    if (!from) return 1;
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${(to || from)}T00:00:00Z`);
    return Math.max(1, Math.round((end - start) / 86400000) + 1);
  }
  if (period === 'all') {
    if (!createdAt) return 1;
    const start = new Date(createdAt);
    const now = new Date();
    const ms = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    return Math.max(1, Math.floor(ms / 86400000) + 1);
  }
  return 1;
};

export const submissionRatio = (submissions, members, days) => {
  const filed = Number(submissions) || 0;
  const possible = Math.max(1, (Number(members) || 0) * (Number(days) || 1));
  return `${filed}/${possible}`;
};
