import { DOC_EXTRACT_PROMPTS } from '../prompts/index.js';
import { RISK_THRESHOLDS } from '../config/thresholds.js';
import { DOCUMENT_TYPES } from '../config/document-types.js';

const STORAGE_KEY = 'kaddu_shield_cockpit_v2';
const OLD_STORAGE_KEY = 'kaddu_shield_cockpit_v1';

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

let state = loadLocalState();
let live = { available: false, reason: 'Initialisation', lastError: null };

function loadLocalState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(OLD_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      return {
        scoringRules: parsed.scoringRules || DEFAULT_SCORING_RULES,
        impacts: parsed.impacts || DEFAULT_IMPACTS,
        promptMeta: parsed.promptMeta || buildPromptMetaFromLocal()
      };
    }
  }catch(_){ }
  return { scoringRules: DEFAULT_SCORING_RULES, impacts: DEFAULT_IMPACTS, promptMeta: buildPromptMetaFromLocal() };
}

function saveState(message = 'Configuration sauvegardée localement.'){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  showSuccess(message);
  renderAll();
}

function buildPromptMetaFromLocal(){
  return Object.keys(DOC_EXTRACT_PROMPTS || {}).map((key) => ({
    id: null,
    key,
    label: DOCUMENT_TYPES[key] || key,
    documentType: DOCUMENT_TYPES[key] || key,
    promptText: DOC_EXTRACT_PROMPTS[key] || '',
    version: key === 'default' ? 'fallback' : 'v1.0',
    country: key.includes('risk') || key.includes('crosscheck') ? 'Global' : 'Sénégal',
    status: key === 'default' ? 'archived' : 'active',
    isActive: key !== 'default',
    source: 'local'
  }));
}

function getSupabaseConfig(){
  const cfg = window.KADDU_SUPABASE || {};
  const url = cfg.url || window.SUPABASE_URL || '';
  const anonKey = cfg.anonKey || cfg.anon_key || window.SUPABASE_ANON_KEY || '';
  return { url: String(url || '').replace(/\/$/, ''), anonKey };
}

function getSessionToken(){
  for(const key of ['kaddu_admin_session', 'supabase.auth.token']){
    try{
      const raw = localStorage.getItem(key) || sessionStorage.getItem(key);
      if(!raw) continue;
      const parsed = JSON.parse(raw);
      if(parsed?.access_token) return parsed.access_token;
      if(parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
    }catch(_){ }
  }
  return null;
}

function getAuthHeaders(extra = {}){
  const { anonKey } = getSupabaseConfig();
  const token = getSessionToken() || anonKey;
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

async function rest(path, options = {}){
  const { url, anonKey } = getSupabaseConfig();
  if(!url || !anonKey) throw new Error('Configuration Supabase absente.');
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: getAuthHeaders(options.headers || {})
  });
  const text = await res.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch(_){ data = text; }
  if(!res.ok){
    const msg = typeof data === 'object' ? (data.message || data.error || JSON.stringify(data)) : (data || `HTTP ${res.status}`);
    throw new Error(msg);
  }
  return data;
}

async function loadLiveState(){
  try{
    const [prompts, scoring, impacts] = await Promise.all([
      rest('shield_prompt_rules?select=*&order=prompt_key.asc,updated_at.desc'),
      rest('shield_scoring_rules?select=*&order=rule_key.asc'),
      rest('shield_risk_impacts?select=*&order=anomaly_code.asc')
    ]);

    if(Array.isArray(prompts) && prompts.length){
      state.promptMeta = prompts.map(row => ({
        id: row.id,
        key: row.prompt_key,
        label: row.document_type || DOCUMENT_TYPES[row.prompt_key] || row.prompt_key,
        documentType: row.document_type || row.prompt_key,
        promptText: row.prompt_text || DOC_EXTRACT_PROMPTS[row.prompt_key] || '',
        version: row.version || 'v1.0',
        country: row.country || 'SN',
        status: row.status || (row.is_active ? 'active' : 'draft'),
        isActive: Boolean(row.is_active),
        source: 'supabase',
        updatedAt: row.updated_at
      }));
    }

    if(Array.isArray(scoring) && scoring.length){
      state.scoringRules = scoring.map(row => ({
        id: row.id,
        key: row.rule_key,
        label: row.rule_label || row.rule_key,
        value: Number(row.rule_value ?? 0),
        category: row.category || 'score',
        description: row.description || '',
        enabled: row.enabled !== false,
        source: 'supabase'
      }));
    }

    if(Array.isArray(impacts) && impacts.length){
      state.impacts = impacts.map(row => ({
        id: row.id,
        code: row.anomaly_code,
        label: row.anomaly_label || row.anomaly_code,
        severity: row.severity || 'medium',
        impact: Number(row.score_impact ?? 0),
        recommendation: row.recommendation || '',
        enabled: row.enabled !== false,
        source: 'supabase'
      }));
    }

    live = { available: true, reason: 'Supabase live actif', lastError: null };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(err){
    live = { available: false, reason: 'Fallback local actif', lastError: err.message };
    console.warn('[Kàddu Shield Cockpit] Fallback local :', err.message);
  }
}

function badge(status){
  const normalized = status === 'active' || status === true ? 'active' : status === 'draft' || status === 'testing' ? 'draft' : 'archived';
  const cls = normalized === 'active' ? 'active-badge' : normalized === 'draft' ? 'draft-badge' : 'arch-badge';
  const label = normalized === 'active' ? 'Actif' : normalized === 'draft' ? 'Brouillon' : 'Archivé';
  return `<span class="badge ${cls}">${label}</span>`;
}

function renderStats(){
  document.getElementById('statPrompts').textContent = state.promptMeta.filter(p => p.status === 'active' || p.isActive).length;
  document.getElementById('statRules').textContent = state.scoringRules.length;
  document.getElementById('statImpacts').textContent = state.impacts.length;
  const status = document.getElementById('moduleStatus');
  if(status){
    status.textContent = live.available ? 'Modules Shield V2 : Supabase live actif' : `Modules Shield V2 : fallback local${live.lastError ? ' · SQL à vérifier' : ''}`;
    status.title = live.lastError || '';
  }
}

function renderPrompts(){
  const tbody = document.getElementById('promptsTbody');
  tbody.innerHTML = state.promptMeta.map((p) => `
    <tr>
      <td><strong>${escapeHtml(p.label || p.documentType || p.key)}</strong><br><span class="muted">${escapeHtml(p.source || 'local')}</span></td>
      <td><code>${escapeHtml(p.key)}</code></td>
      <td>${escapeHtml(p.version || '—')}</td>
      <td>${escapeHtml(p.country || '—')}</td>
      <td>${badge(p.status)}</td>
      <td class="row-actions"><button class="small-btn" data-view-prompt="${escapeAttr(p.key)}">Voir / modifier</button><button class="small-btn" data-toggle-prompt="${escapeAttr(p.key)}">${p.status === 'active' ? 'Désactiver' : 'Activer'}</button></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-view-prompt]').forEach(btn => btn.addEventListener('click', () => showPrompt(btn.dataset.viewPrompt)));
  tbody.querySelectorAll('[data-toggle-prompt]').forEach(btn => btn.addEventListener('click', () => togglePrompt(btn.dataset.togglePrompt)));
}

function showPrompt(key){
  const meta = state.promptMeta.find(p => p.key === key) || { key, promptText: DOC_EXTRACT_PROMPTS[key] || '' };
  document.getElementById('promptDetail').innerHTML = `
    <div class="box-title">${escapeHtml(meta.label || meta.documentType || key)} · <code>${escapeHtml(key)}</code></div>
    <div class="form-grid" style="margin-bottom:12px">
      <div><label>Prompt key</label><input id="promptKeyInput" value="${escapeAttr(meta.key || '')}" ${meta.id ? 'readonly' : ''}></div>
      <div><label>Document type</label><input id="promptDocInput" value="${escapeAttr(meta.documentType || meta.label || '')}"></div>
      <div><label>Version</label><input id="promptVersionInput" value="${escapeAttr(meta.version || 'v1.0')}"></div>
      <div><label>Pays</label><input id="promptCountryInput" value="${escapeAttr(meta.country || 'SN')}"></div>
      <div><label>Statut</label><select id="promptStatusInput"><option value="draft" ${meta.status === 'draft' ? 'selected' : ''}>Brouillon</option><option value="testing" ${meta.status === 'testing' ? 'selected' : ''}>Test</option><option value="active" ${meta.status === 'active' ? 'selected' : ''}>Actif</option><option value="archived" ${meta.status === 'archived' ? 'selected' : ''}>Archivé</option></select></div>
      <div><label>Source</label><input value="${escapeAttr(meta.source || 'local')}" readonly></div>
    </div>
    <label>Contenu du prompt</label>
    <textarea id="promptTextInput" style="min-height:260px">${escapeHtml(meta.promptText || DOC_EXTRACT_PROMPTS[key] || '')}</textarea>
    <div class="row-actions" style="margin-top:12px">
      <button class="btn" id="savePromptBtn">Enregistrer</button>
      <button class="btn-ghost" id="duplicatePromptBtn">Dupliquer en brouillon</button>
    </div>`;
  document.getElementById('savePromptBtn').addEventListener('click', () => savePromptFromEditor(meta.key));
  document.getElementById('duplicatePromptBtn').addEventListener('click', () => duplicatePromptFromEditor(meta.key));
}

function readPromptEditor(){
  const key = document.getElementById('promptKeyInput')?.value?.trim();
  const documentType = document.getElementById('promptDocInput')?.value?.trim();
  const version = document.getElementById('promptVersionInput')?.value?.trim() || 'v1.0';
  const country = document.getElementById('promptCountryInput')?.value?.trim() || 'SN';
  const status = document.getElementById('promptStatusInput')?.value || 'draft';
  const promptText = document.getElementById('promptTextInput')?.value || '';
  if(!key || !documentType || !promptText.trim()) throw new Error('Prompt key, type document et texte sont obligatoires.');
  return { key, documentType, version, country, status, promptText, isActive: status === 'active' };
}

async function savePromptFromEditor(originalKey){
  try{
    const data = readPromptEditor();
    let item = state.promptMeta.find(p => p.key === originalKey) || state.promptMeta.find(p => p.key === data.key);
    if(item){ Object.assign(item, data, { label: data.documentType, source: live.available ? 'supabase' : 'local' }); }
    else { item = { ...data, label: data.documentType, id: null, source: 'local' }; state.promptMeta.push(item); }
    if(live.available){ await upsertPrompt(item); }
    saveState(live.available ? 'Prompt sauvegardé dans Supabase.' : 'Prompt sauvegardé localement.');
  }catch(err){ alert(err.message); }
}

function duplicatePromptFromEditor(originalKey){
  try{
    const data = readPromptEditor();
    const copyKey = `${data.key}_draft_${Date.now().toString().slice(-5)}`;
    state.promptMeta.push({ ...data, key: copyKey, version: 'draft', status: 'draft', isActive: false, id: null, source: 'local' });
    saveState('Prompt dupliqué en brouillon local.');
    showPrompt(copyKey);
  }catch(err){ alert(err.message); }
}

function togglePrompt(key){
  const item = state.promptMeta.find(p => p.key === key);
  if(!item) return;
  item.status = item.status === 'active' ? 'draft' : 'active';
  item.isActive = item.status === 'active';
  renderPrompts(); renderStats();
}

async function upsertPrompt(item){
  const payload = {
    prompt_key: item.key,
    document_type: item.documentType || item.label || item.key,
    country: item.country || 'SN',
    version: item.version || 'v1.0',
    status: item.status || 'draft',
    prompt_text: item.promptText || '',
    is_active: item.status === 'active',
    updated_by: getSessionEmail() || 'admin'
  };
  if(item.id){
    await rest(`shield_prompt_rules?id=eq.${item.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  }else{
    const rows = await rest('shield_prompt_rules', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ ...payload, created_by: payload.updated_by }) });
    if(Array.isArray(rows) && rows[0]) item.id = rows[0].id;
  }
}

function getSessionEmail(){
  try{
    const raw = localStorage.getItem('kaddu_admin_session') || sessionStorage.getItem('kaddu_admin_session');
    if(!raw) return null;
    const s = JSON.parse(raw);
    return s?.user?.email || null;
  }catch(_){ return null; }
}

function renderScoring(){
  const tbody = document.getElementById('scoringTbody');
  tbody.innerHTML = state.scoringRules.map((r, idx) => `
    <tr>
      <td><strong>${escapeHtml(r.label)}</strong><br><code>${escapeHtml(r.key)}</code></td>
      <td><input type="number" value="${Number(r.value)}" data-rule-value="${idx}" /></td>
      <td><input value="${escapeAttr(r.category)}" data-rule-category="${idx}" /></td>
      <td><input value="${escapeAttr(r.description || '')}" data-rule-description="${idx}" /></td>
      <td><select data-rule-enabled="${idx}"><option value="true" ${r.enabled ? 'selected' : ''}>Oui</option><option value="false" ${!r.enabled ? 'selected' : ''}>Non</option></select></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-rule-value]').forEach(input => input.addEventListener('input', () => state.scoringRules[Number(input.dataset.ruleValue)].value = Number(input.value)));
  tbody.querySelectorAll('[data-rule-category]').forEach(input => input.addEventListener('input', () => state.scoringRules[Number(input.dataset.ruleCategory)].category = input.value));
  tbody.querySelectorAll('[data-rule-description]').forEach(input => input.addEventListener('input', () => state.scoringRules[Number(input.dataset.ruleDescription)].description = input.value));
  tbody.querySelectorAll('[data-rule-enabled]').forEach(sel => sel.addEventListener('change', () => state.scoringRules[Number(sel.dataset.ruleEnabled)].enabled = sel.value === 'true'));
}

function renderImpacts(){
  const tbody = document.getElementById('impactsTbody');
  tbody.innerHTML = state.impacts.map((r, idx) => `
    <tr>
      <td><strong>${escapeHtml(r.label)}</strong><br><code>${escapeHtml(r.code)}</code></td>
      <td><select data-impact-severity="${idx}">${['low','medium','high','critical'].map(s => `<option value="${s}" ${r.severity === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      <td><input type="number" value="${Number(r.impact)}" data-impact-value="${idx}" /></td>
      <td><input value="${escapeAttr(r.recommendation)}" data-impact-reco="${idx}" /></td>
      <td><select data-impact-enabled="${idx}"><option value="true" ${r.enabled ? 'selected' : ''}>Oui</option><option value="false" ${!r.enabled ? 'selected' : ''}>Non</option></select></td>
    </tr>`).join('');

  tbody.querySelectorAll('[data-impact-severity]').forEach(sel => sel.addEventListener('change', () => state.impacts[Number(sel.dataset.impactSeverity)].severity = sel.value));
  tbody.querySelectorAll('[data-impact-value]').forEach(input => input.addEventListener('input', () => state.impacts[Number(input.dataset.impactValue)].impact = Number(input.value)));
  tbody.querySelectorAll('[data-impact-reco]').forEach(input => input.addEventListener('input', () => state.impacts[Number(input.dataset.impactReco)].recommendation = input.value));
  tbody.querySelectorAll('[data-impact-enabled]').forEach(sel => sel.addEventListener('change', () => state.impacts[Number(sel.dataset.impactEnabled)].enabled = sel.value === 'true'));
}

function addImpact(){
  state.impacts.unshift({ code: `custom_${Date.now().toString().slice(-5)}`, label: 'Nouvelle anomalie', severity: 'medium', impact: -5, recommendation: 'À définir.', enabled: true, source: 'local' });
  renderImpacts(); renderStats();
}

function addPrompt(){
  const key = `custom_prompt_${Date.now().toString().slice(-5)}`;
  state.promptMeta.unshift({ key, label: 'Nouveau prompt', documentType: 'Nouveau document', promptText: 'Tu analyses un document pour Kàddu.\n\nRetourne ce JSON strict :\nKADDU_DOC:{"type_document":"nouveau_document","confidence":0,"anomalies":[]}', version: 'draft', country: 'SN', status: 'draft', isActive: false, source: 'local' });
  renderPrompts(); renderStats(); showPrompt(key);
}

async function saveLive(){
  if(!live.available){ alert(`Supabase n’est pas disponible : ${live.lastError || 'configuration absente'}. Exécute le SQL puis recharge la page.`); return; }
  try{
    for(const p of state.promptMeta){ await upsertPrompt(p); }
    for(const r of state.scoringRules){ await upsertScoring(r); }
    for(const i of state.impacts){ await upsertImpact(i); }
    await loadLiveState(); renderAll(); showSuccess('Configuration sauvegardée dans Supabase.');
  }catch(err){ alert(`Sauvegarde Supabase impossible : ${err.message}`); }
}

async function upsertScoring(r){
  const payload = { rule_key: r.key, rule_label: r.label, rule_value: Number(r.value), category: r.category, description: r.description || null, enabled: r.enabled !== false, updated_by: getSessionEmail() || 'admin' };
  if(r.id) await rest(`shield_scoring_rules?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  else {
    const rows = await rest('shield_scoring_rules', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    if(Array.isArray(rows) && rows[0]) r.id = rows[0].id;
  }
}

async function upsertImpact(i){
  const payload = { anomaly_code: i.code, anomaly_label: i.label, severity: i.severity, score_impact: Number(i.impact), recommendation: i.recommendation || null, enabled: i.enabled !== false, updated_by: getSessionEmail() || 'admin' };
  if(i.id) await rest(`shield_risk_impacts?id=eq.${i.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  else {
    const rows = await rest('shield_risk_impacts', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(payload) });
    if(Array.isArray(rows) && rows[0]) i.id = rows[0].id;
  }
}

async function seedSupabase(){
  if(!confirm('Initialiser Supabase avec les prompts/règles locaux ? Cette action ajoute les lignes manquantes.')) return;
  if(!getSupabaseConfig().url){ alert('Configuration Supabase absente.'); return; }
  live.available = true;
  try{ await saveLive(); showSuccess('Supabase initialisé avec la configuration actuelle.'); }
  catch(err){ alert(`Initialisation impossible : ${err.message}\n\nVérifie que le SQL V2 a été exécuté dans Supabase.`); }
}

function runSimulation(){
  let score = 100;
  const revenue = Number(document.getElementById('simRevenue').value || 0);
  const rent = Number(document.getElementById('simRent').value || 0);
  const effort = revenue ? Math.round((rent / revenue) * 100) : 999;
  const triggered = [];

  const identity = document.getElementById('simIdentity').value;
  const income = document.getElementById('simIncome').value;
  const docs = document.getElementById('simDocs').value;
  const network = document.getElementById('simNetwork').value;

  if(identity === 'expired') addImpactToScore('identity_expired');
  if(identity === 'missing') addImpactToScore('identity_missing');
  if(income === 'partial') addImpactToScore('income_partial');
  if(income === 'missing') addImpactToScore('income_missing');
  if(docs === 'blurred') addImpactToScore('document_blurred');
  if(docs === 'incomplete') addImpactToScore('document_incomplete');
  if(network === 'duplicate_phone') addImpactToScore('duplicate_phone');
  if(network === 'duplicate_iban') addImpactToScore('duplicate_iban');
  if(effort >= getRuleValue('HIGH_EFFORT_RATIO', 45)) addImpactToScore('effort_ratio_high');
  else if(effort >= getRuleValue('MAX_EFFORT_RATIO', 35)) addImpactToScore('effort_ratio_warning');

  function addImpactToScore(code){
    const impact = state.impacts.find(i => i.code === code && i.enabled !== false);
    if(!impact) return;
    score += Number(impact.impact || 0);
    triggered.push(impact);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const pre = getRuleValue('PREVALIDATION_SCORE', 80);
  const human = getRuleValue('HUMAN_REVIEW_SCORE', 50);
  const waiting = getRuleValue('WAITING_SCORE', 30);
  const decision = score >= pre ? 'Pré-validation possible' : score >= human ? 'Vérification humaine' : score >= waiting ? 'Mise en attente / pièces complémentaires' : 'Refus recommandé';

  document.getElementById('simulationScore').textContent = `${score}/100`;
  document.getElementById('statSimulation').textContent = score;
  document.getElementById('simulationDecision').textContent = `${decision} · taux d’effort ${effort}%`;
  document.getElementById('simulationOutput').innerHTML = triggered.length
    ? `<div class="box-title">Alertes déclenchées</div>${triggered.map(t => `<div class="box"><strong>${escapeHtml(t.label)}</strong> · ${escapeHtml(t.severity)} · ${Number(t.impact)} pts<br><span class="muted">${escapeHtml(t.recommendation)}</span></div>`).join('')}`
    : '<p class="muted">Aucune alerte structurée déclenchée.</p>';
}

function getRuleValue(key, fallback){
  const rule = state.scoringRules.find(r => r.key === key && r.enabled !== false);
  return rule ? Number(rule.value) : fallback;
}

function exportConfig(){
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString(), live }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kaddu-shield-config-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderAll(){ renderStats(); renderPrompts(); renderScoring(); renderImpacts(); }

function setupTabs(){
  document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`panel-${tab.dataset.tab}`)?.classList.add('active');
  }));
}

function setupActions(){
  document.getElementById('saveLocalBtn')?.addEventListener('click', () => saveState());
  document.getElementById('saveLiveBtn')?.addEventListener('click', saveLive);
  document.getElementById('seedSupabaseBtn')?.addEventListener('click', seedSupabase);
  document.getElementById('exportConfigBtn')?.addEventListener('click', exportConfig);
  document.getElementById('refreshPromptsBtn')?.addEventListener('click', async () => { await loadLiveState(); renderAll(); });
  document.getElementById('addImpactBtn')?.addEventListener('click', addImpact);
  document.getElementById('addPromptBtn')?.addEventListener('click', addPrompt);
  document.getElementById('runSimulationBtn')?.addEventListener('click', runSimulation);
}

function showSuccess(message){
  const el = document.getElementById('successNote');
  if(!el) return;
  el.textContent = message;
  el.style.display = 'block';
  clearTimeout(showSuccess._t);
  showSuccess._t = setTimeout(() => el.style.display = 'none', 3000);
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
}
function escapeAttr(value){ return escapeHtml(value).replace(/`/g, '&#96;'); }

async function init(){
  setupTabs(); setupActions();
  await loadLiveState();
  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
