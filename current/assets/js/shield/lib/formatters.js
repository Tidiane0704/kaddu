export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  return `${Math.round(Number(score))}/100`;
}
