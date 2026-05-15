export function buildBasicCrossChecks(declared = {}, extracted = {}) {
  const checks = [];

  function add(field, label) {
    if (!declared[field] || !extracted[field]) return;
    const ok = String(declared[field]).toLowerCase() === String(extracted[field]).toLowerCase();
    checks.push({
      control_code: `check_${field}`,
      label,
      declared_value: declared[field],
      extracted_value: extracted[field],
      result: ok ? 'ok' : 'warning',
      severity: ok ? 'low' : 'medium',
      score_impact: ok ? 0 : -8,
      explanation: ok ? 'Correspondance détectée.' : 'Écart à vérifier.'
    });
  }

  add('nom', 'Nom candidat');
  add('date_naissance', 'Date de naissance');
  add('employeur', 'Employeur');
  add('revenu_mensuel', 'Revenu mensuel');

  return checks;
}
