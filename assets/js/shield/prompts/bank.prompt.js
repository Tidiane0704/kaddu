export const bankPrompt = `Tu analyses un relevé bancaire ou mobile money pour Kàddu.
Identifie banque/service, titulaire, période, solde moyen estimé, revenus réguliers, gros débits/crédits, couverture de 3 mois.
Signale dépôts inhabituels, virement circulaire, période incomplète.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"releve_bancaire|releve_mobile_money|releve_wave|releve_orange_money|autre","titulaire":"","iban_ou_numero":"","banque_ou_service":"","periode_debut":"","periode_fin":"","nb_mois_couverts":null,"solde_moyen_estime":null,"devise":"XOF|EUR|autre","revenus_reguliers_detectes":false,"montant_revenu_regulier":null,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
