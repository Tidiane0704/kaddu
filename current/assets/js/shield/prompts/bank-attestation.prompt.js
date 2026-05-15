export const bankAttestationPrompt = `Tu analyses une attestation bancaire pour Kàddu.
Identifie banque, titulaire, pays, compte partiel, date, solde éventuel, cachet, signature.
Distingue attestation officielle et simple capture.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"attestation_bancaire","titulaire":"","banque":"","pays":"","numero_compte_partiel":"","date_document":"","solde_indique":null,"devise":"XOF|EUR|autre","relation_bancaire_confirmee":false,"capacite_financiere_confirmee":false,"cachet_present":false,"signature_presente":false,"recent":false,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
