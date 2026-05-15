export const mobileMoneyPrompt = `Tu analyses un reçu ou une capture Mobile Money pour Kàddu : Wave, Orange Money, Free Money, Wizall ou autre.
Extrais service, titulaire, bénéficiaire, montant, date, référence, motif.
Une capture isolée ne prouve pas un revenu régulier : signale-le.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"recu_mobile_money","service":"","titulaire":"","beneficiaire":"","telephone_partiel":"","montant":null,"devise":"XOF|EUR|autre","date_transaction":"","reference_transaction":"","motif_detecte":"","paiement_loyer_detecte":false,"revenu_detecte":false,"capture_ecran_probable":false,"document_origin":"screenshot|photo|pdf_native|scan|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
