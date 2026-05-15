import { normalizeDocKey } from './normalizers.js';

export const DOC_KEY_MAP = {
  cni: 'cni',
  passeport: 'cni',
  identite: 'cni',
  titre_sejour: 'cni',

  fiche_paie: 'fiches_paie',
  fiches_paie: 'fiches_paie',
  bulletin_salaire: 'fiches_paie',

  releve: 'releve',
  bancaire: 'releve',
  rib: 'releve',

  wave: 'recu_mobile_money',
  recu_wave: 'recu_mobile_money',
  orange_money: 'recu_mobile_money',
  om: 'recu_mobile_money',
  free_money: 'recu_mobile_money',
  recu_mobile_money: 'recu_mobile_money',

  attestation_travail: 'attestation_travail',
  attestation_employeur: 'attestation_travail',
  certificat_travail: 'attestation_travail',

  attestation_bancaire: 'attestation_bancaire',
  certificat_bancaire: 'attestation_bancaire',

  cnss: 'cnss_ipres',
  ipres: 'cnss_ipres',
  cotisation_sociale: 'cnss_ipres',

  garant: 'garant',
  prise_en_charge: 'garant',
  attestation_garant: 'garant',

  certif_scol: 'certif_scol',
  scolarite: 'certif_scol'
};

export function resolveDocType(docKey = '') {
  const parts = String(docKey).split('_');
  const raw = parts.length > 1 ? parts.slice(1).join('_') : docKey;
  const normalized = normalizeDocKey(raw);
  return DOC_KEY_MAP[normalized] || normalized || 'default';
}

export function getDocPrompt(docKey, prompts) {
  const type = resolveDocType(docKey);
  return prompts[type] || prompts.default;
}
