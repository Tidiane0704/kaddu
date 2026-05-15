import { normalizePhone, normalizeText } from './normalizers.js';

export function detectNetworkSignals(currentRow, allRows = []) {
  if (!currentRow) return { score: 100, signals: [] };

  const signals = [];
  const currentId = currentRow.id;

  const fields = [
    ['email', normalizeText],
    ['telephone', normalizePhone],
    ['numero_whatsapp', normalizePhone],
    ['id_number', normalizeText],
    ['iban', normalizeText],
    ['bailleur_contact', normalizePhone]
  ];

  for (const [field, normalizer] of fields) {
    const value = normalizer(currentRow[field] || '');
    if (!value) continue;

    const matches = allRows.filter(r =>
      r.id !== currentId && normalizer(r[field] || '') === value
    );

    if (matches.length) {
      signals.push({
        code: `duplicate_${field}`,
        severity: field === 'id_number' || field === 'iban' ? 'high' : 'medium',
        message: `${field} déjà utilisé sur ${matches.length} autre(s) dossier(s).`,
        matches: matches.map(m => m.id)
      });
    }
  }

  const penalty = signals.reduce((sum, s) => sum + (s.severity === 'high' ? 25 : 12), 0);
  return {
    score: Math.max(0, 100 - penalty),
    signals
  };
}
