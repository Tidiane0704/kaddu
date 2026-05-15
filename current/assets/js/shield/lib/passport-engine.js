export function computePassportTrend(history = []) {
  if (!Array.isArray(history) || history.length < 2) return 'stable';
  const latest = Number(history[0]?.score || 0);
  const previous = Number(history[1]?.score || 0);
  if (latest > previous + 5) return 'improving';
  if (latest < previous - 5) return 'declining';
  return 'stable';
}
