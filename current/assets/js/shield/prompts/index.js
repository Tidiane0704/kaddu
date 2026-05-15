import { identityPrompt } from './identity.prompt.js';
import { salaryPrompt } from './salary.prompt.js';
import { bankPrompt } from './bank.prompt.js';
import { mobileMoneyPrompt } from './mobile-money.prompt.js';
import { workAttestationPrompt } from './work-attestation.prompt.js';
import { bankAttestationPrompt } from './bank-attestation.prompt.js';
import { cnssIpresPrompt } from './cnss-ipres.prompt.js';
import { guarantorPrompt } from './guarantor.prompt.js';
import { studentPrompt } from './student.prompt.js';
import { dossierRiskPrompt } from './dossier-risk.prompt.js';
import { fraudCrosscheckPrompt } from './fraud-crosscheck.prompt.js';

export const COMMON_DOC_RULES = `
RÈGLES ABSOLUES :
1. Retourne d'abord le JSON KADDU_DOC: sur une seule ligne, sans markdown.
2. Les nombres doivent être des nombres, pas des chaînes.
3. Les dates sont au format YYYY-MM-DD.
4. confidence est entre 0.0 et 1.0.
5. anomalies est un tableau, vide si aucune anomalie.
6. Ne jamais écrire "fraude" ou "fraudeur".
7. Utilise "incohérence", "anomalie", "à vérifier".
`;

export const DOC_EXTRACT_PROMPTS = {
  cni: identityPrompt,
  fiches_paie: salaryPrompt,
  releve: bankPrompt,
  recu_mobile_money: mobileMoneyPrompt,
  attestation_travail: workAttestationPrompt,
  attestation_bancaire: bankAttestationPrompt,
  cnss_ipres: cnssIpresPrompt,
  garant: guarantorPrompt,
  certif_scol: studentPrompt,
  dossier_risk: dossierRiskPrompt,
  fraud_crosscheck: fraudCrosscheckPrompt,
  default: fraudCrosscheckPrompt
};

export function getPromptWithRules(key) {
  const prompt = DOC_EXTRACT_PROMPTS[key] || DOC_EXTRACT_PROMPTS.default;
  return `${prompt}\n\n${COMMON_DOC_RULES}`;
}
