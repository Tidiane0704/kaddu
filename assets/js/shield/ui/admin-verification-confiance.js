import { DOC_EXTRACT_PROMPTS } from '../prompts/index.js';
import { RISK_THRESHOLDS } from '../config/thresholds.js';
import { DOCUMENT_TYPES } from '../config/document-types.js';

const STORAGE_KEY = 'kaddu_shield_cockpit_v1';

const DEFAULT_SCORING_RULES = [
  { key: 'PREVALIDATION_SCORE', label: 'Score pré-validation', value: RISK_THRESHOLDS.PREVALIDATION_SCORE ?? 80, category: 'score', description: 'Score minimum pour recommander une pré-validation.', enabled: true },
  { key: 'HUMAN_REVIEW_SCORE', label: 'Score vérification humaine', value: RISK_THRESHOLDS.HUMAN_REVIEW_SCORE ?? 50, category: 'score', description: 'Score minimum pour instruire avec contrôle humain.', enabled: true },
  { key: 'WAITING_SCORE', label: 'Score mise en attente', value: RISK_THRESHOLDS.WAITING_SCORE ?? 30, category: 'score', description: 'Score minimum avant refus recommandé.', enabled: true },
  { key: 'MAX_EFFORT_RATIO', label: 'Taux effort vigilance', value: Math.round((RISK_THRESHOLDS.MAX_EFFORT_RATIO ?? 0.35) * 100), category: 'ratio', description: 'Seuil de vigilance sur loyer / revenus.', enabled: true },
  { key: 'HIGH_EFFORT_RATIO', label: 'Taux effort critique', value: Math.round((RISK_THRESHOLDS.HIGH_EFFORT_RATIO ?? 0.45) * 100), category: 'ratio', description: 'Seuil critique sur loyer / revenus.', enabled: true },
  { key: 'WEIGHT_IDENTITY', label: 'Poids identité', value: 20, category: 'pondération', description: 'Poids indicatif de l’identité dans le scoring.', enabled: true },
  { key: 'WEIGHT_REVENUE', label: 'Poids revenus', value: 25, category: 'pondération', description: 'Poids indicatif des revenus dans le scoring.', enabled: true },
  { key: 'WEIGHT_DOCUMENTS', label: 'Poids documents', value: 20, category: 'pondération', description: 'Poids indicatif de la qualité documentaire.', enabled: true },
  { key: 'WEIGHT_COHERENCE', label: 'Poids cohérence', value: 20, category: 'pondération', description: 'Poids indicatif de la cohérence globale.', enabled: true },
  { key: 'WEIGHT_NETWORK', label: 'Poids réseau', value: 15, category: 'pondération', description: 'Poids indicatif des signaux de doublons réseau.', enabled: true }
];

const DEFAULT_IMPACTS = [
  { code: 'identity_expired', label: 'Pièce d’identité expirée', severity: 'high', impact: -20, recommendation: 'Demander une pièce valide ou vérifier manuellement.', enabled: true },
  { code: 'identity_missing', label: 'Pièce d’identité manquante', severity: 'critical', impact: -30, recommendation: 'Bloquer l’instruction tant que l’identité n’est pas confirmée.', enabled: true },
  { code: 'name_mismatch', label: 'Nom différent entre documents', severity: 'critical', impact: -30, recommendation: 'Investigation conseiller obligatoire.', enabled: true },
  { code: 'income_missing', label: 'Revenus non prouvés', severity: 'high', impact: -15, recommendation: 'Demander justificatif de revenus complémentaire.', enabled: true },
  { code: 'income_partial', label: 'Revenus partiellement prouvés', severity: 'medium', impact: -8, recommendation: 'Demander 3 mois de justificatifs ou relevé bancaire.', enabled: true },
  { code: 'document_blurred', label: 'Document flou', severity: 'medium', impact: -8, recommendation: 'Demander un nouveau document lisible.', enabled: true },
  { code: 'document_incomplete', label: 'Document incomplet', severity: 'medium', impact: -10, recommendation: 'Demander les pages ou périodes manquantes.', enabled: true },
  { code: 'effort_ratio_high', label: 'Taux d’effort élevé', severity: 'high', impact: -15, recommendation: 'Vérifier garant ou revenus complémentaires.', enabled: true },
  { code: 'effort_ratio_warning', label: 'Taux d’effort en vigilance', severity: 'medium', impact: -7, recommendation: 'Contrôle conseiller recommandé.', enabled: true },
  { code: 'duplicate_phone', label: 'Téléphone déjà utilisé', severity: 'medium', impact: -12, recommendation: 'Vérifier s’il s’agit d’un ménage, garant ou doublon.', enabled: true },
  { code: 'duplicate_iban', label: 'IBAN déjà utilisé', severity: 'critical', impact: -35, recommendation: 'Investigation réseau obligatoire.', enabled: true }
];

let state = loadState();

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return JSON.parse(raw);
  }catch(_){ }
  return {
    scoringRules: DEFAULT_SCORING_RULES,
    impacts: DEFAULT_IMPACTS,
    promptMeta: buildPromptMeta()
  };
}

function saveState(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showSuccess('Configuration sauvegardée localement.');
}

function buildPromptMeta(){
  return Object.keys(DOC_EXTRACT_PROMPTS || {}).map((key) => ({
    key,
    label: DOCUMENT_TYPES[key] || key,
    version: key === 'default' ? 'fallback' : 'v1.0',
    country: key.includes('risk') || key.includes('crosscheck') ? 'Global' : 'Sénégal',
    status: key === 'default' ? 'archived' : 'active'
  }));
}

function badge(status){
  const cls = status === 'active' ? 'active-badge' : status === 'draft' ? 'draft-badge' : 'arch-badge';
  const label = status === 'active' ? 'Actif' : status === 'draft' ? 'Brouillon' : 'Archivé';
  return `<span class="badge ${cls}">${label}</span>`;
}

function severityBadge(severity){
  const map = { critical: 'crit', high: 'high', medium: 'medium', low: 'low' };
  const label = { critical: 'Critique', high: 'Élevée', medium: 'Moyenne', low: 'Faible' }[severity] || severity;
  return `<span class="badge ${map[severity] || 'medium'}">${label}</span>`;
}

function renderStats(){
  document.getElementById('statPrompts').textContent = state.promptMeta.filter(p => p.status === 'active').length;
  document.getElementById('statRules').textContent = state.scoringRules.length;
  document.getElementById('statImpacts').textContent = state.impacts.length;
}

function renderPrompts(){
  const tbody = document.getElementById('promptsTbody');
  tbody.innerHTML = state.promptMeta.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.label)}</strong></td>
      <td><code>${escapeHtml(p.key)}</code></td>
      <td>${escapeHtml(p.version)}</td>
      <td>${escapeHtml(p.country)}</td>
      <td>${badge(p.status)}</td>
      <td class="row-actions"><button class="small-btn" data-view-prompt="${escapeHtml(p.key)}">Voir</button><button class="small-btn" data-toggle-prompt="${escapeHtml(p.key)}">${p.status === 'active' ? 'Désactiver' : 'Activer'}</button></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-view-prompt]').forEach(btn => btn.addEventListener('click', () => showPrompt(btn.dataset.viewPrompt)));
  tbody.querySelectorAll('[data-toggle-prompt]').forEach(btn => btn.addEventListener('click', () => togglePrompt(btn.dataset.togglePrompt)));
}

function showPrompt(key){
  const prompt = DOC_EXTRACT_PROMPTS[key] || '';
  const meta = state.promptMeta.find(p => p.key === key);
  document.getElementById('promptDetail').innerHTML = `
    <div class="box-title">${escapeHtml(meta?.label || key)} · <code>${escapeHtml(key)}</code></div>
    <p class="muted">Version ${escapeHtml(meta?.version || '—')} · ${escapeHtml(meta?.country || '—')} · statut ${escapeHtml(meta?.status || '—')}</p>
    <pre>${escapeHtml(prompt)}</pre>
  `;
}

function togglePrompt(key){
  const item = state.promptMeta.find(p => p.key === key);
  if(!item) return;
  item.status = item.status === 'active' ? 'draft' : 'active';
  renderPrompts();
  renderStats();
}

function renderScoring(){
  const tbody = document.getElementById('scoringTbody');
  tbody.innerHTML = state.scoringRules.map((r, idx) => `
    <tr>
      <td><strong>${escapeHtml(r.label)}</strong><br><code>${escapeHtml(r.key)}</code></td>
      <td><input type="number" value="${Number(r.value)}" data-rule-value="${idx}" /></td>
      <td>${escapeHtml(r.category)}</td>
      <td class="muted">${escapeHtml(r.description)}</td>
      <td><select data-rule-enabled="${idx}"><option value="true" ${r.enabled ? 'selected' : ''}>Oui</option><option value="false" ${!r.enabled ? 'selected' : ''}>Non</option></select></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-rule-value]').forEach(input => input.addEventListener('input', () => {
    state.scoringRules[Number(input.dataset.ruleValue)].value = Number(input.value);
  }));
  tbody.querySelectorAll('[data-rule-enabled]').forEach(sel => sel.addEventListener('change', () => {
    state.scoringRules[Number(sel.dataset.ruleEnabled)].enabled = sel.value === 'true';
  }));
}

function renderImpacts(){
  const tbody = document.getElementById('impactsTbody');
  tbody.innerHTML = state.impacts.map((r, idx) => `
    <tr>
      <td><strong>${escapeHtml(r.label)}</strong><br><code>${escapeHtml(r.code)}</code></td>
      <td><select data-impact-severity="${idx}">
        ${['low','medium','high','critical'].map(s => `<option value="${s}" ${r.severity === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select></td>
      <td><input type="number" value="${Number(r.impact)}" data-impact-value="${idx}" /></td>
      <td><input value="${escapeAttr(r.recommendation)}" data-impact-reco="${idx}" /></td>
      <td><select data-impact-enabled="${idx}"><option value="true" ${r.enabled ? 'selected' : ''}>Oui</option><option value="false" ${!r.enabled ? 'selected' : ''}>Non</option></select></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-impact-severity]').forEach(sel => sel.addEventListener('change', () => state.impacts[Number(sel.dataset.impactSeverity)].severity = sel.value));
  tbody.querySelectorAll('[data-impact-value]').forEach(input => input.addEventListener('input', () => state.impacts[Number(input.dataset.impactValue)].impact = Number(input.value)));
  tbody.querySelectorAll('[data-impact-reco]').forEach(input => input.addEventListener('input', () => state.impacts[Number(input.dataset.impactReco)].recommendation = input.value));
  tbody.querySelectorAll('[data-impact-enabled]').forEach(sel => sel.addEventListener('change', () => state.impacts[Number(sel.dataset.impactEnabled)].enabled = sel.value === 'true'));
}

function getImpact(code){
  return state.impacts.find(i => i.code === code && i.enabled);
}

function runSimulation(){
  const revenue = Number(document.getElementById('simRevenue').value || 0);
  const rent = Number(document.getElementById('simRent').value || 0);
  const ratio = revenue ? rent / revenue : 1;
  const flags = [];

  const identity = document.getElementById('simIdentity').value;
  const income = document.getElementById('simIncome').value;
  const docs = document.getElementById('simDocs').value;
  const network = document.getElementById('simNetwork').value;

  if(identity === 'expired') flags.push('identity_expired');
  if(identity === 'missing') flags.push('identity_missing');
  if(income === 'partial') flags.push('income_partial');
  if(income === 'missing') flags.push('income_missing');
  if(docs === 'blurred') flags.push('document_blurred');
  if(docs === 'incomplete') flags.push('document_incomplete');
  if(network === 'duplicate_phone') flags.push('duplicate_phone');
  if(network === 'duplicate_iban') flags.push('duplicate_iban');
  if(ratio >= 0.45) flags.push('effort_ratio_high');
  else if(ratio >= 0.35) flags.push('effort_ratio_warning');

  const impacts = flags.map(code => getImpact(code)).filter(Boolean);
  const penalty = impacts.reduce((sum, f) => sum + Math.abs(Number(f.impact || 0)), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const decision = score >= 80 ? 'Pré-validation possible' : score >= 50 ? 'Vérification humaine' : score >= 30 ? 'Mise en attente / pièces complémentaires' : 'Refus recommandé';

  document.getElementById('simulationScore').textContent = `${score}/100`;
  document.getElementById('statSimulation').textContent = score;
  document.getElementById('simulationDecision').textContent = `${decision} · taux d’effort ${Math.round(ratio * 100)}%`;
  document.getElementById('simulationOutput').innerHTML = impacts.length
    ? `<div class="box-title" style="margin-top:14px">Alertes simulées</div>${impacts.map(i => `
      <div class="box"><div>${severityBadge(i.severity)} <strong>${escapeHtml(i.label)}</strong> <span class="muted">(${Number(i.impact)} pts)</span></div><p class="muted">${escapeHtml(i.recommendation)}</p></div>`).join('')}`
    : '<p class="muted">Aucune anomalie majeure détectée dans cette simulation.</p>';
}

function addImpact(){
  state.impacts.push({ code: `custom_${Date.now()}`, label: 'Nouvelle anomalie', severity: 'medium', impact: -5, recommendation: 'À documenter.', enabled: true });
  renderImpacts();
  renderStats();
}

function exportConfig(){
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaddu-shield-config-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function showSuccess(message){
  const el = document.getElementById('successNote');
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(showSuccess._t);
  showSuccess._t = setTimeout(() => el.style.display = 'none', 2500);
}

function setupTabs(){
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
  }));
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/'/g, '&#39;'); }

function init(){
  setupTabs();
  document.getElementById('moduleStatus').textContent = 'Modules Shield : chargés';
  document.getElementById('saveLocalBtn').addEventListener('click', saveState);
  document.getElementById('exportConfigBtn').addEventListener('click', exportConfig);
  document.getElementById('refreshPromptsBtn').addEventListener('click', () => { state.promptMeta = buildPromptMeta(); renderPrompts(); renderStats(); });
  document.getElementById('addImpactBtn').addEventListener('click', addImpact);
  document.getElementById('runSimulationBtn').addEventListener('click', runSimulation);
  renderStats();
  renderPrompts();
  renderScoring();
  renderImpacts();
}

init();
