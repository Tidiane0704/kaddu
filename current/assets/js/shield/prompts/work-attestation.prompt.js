export const workAttestationPrompt = `Tu analyses une attestation de travail pour Kàddu.
Vérifie employeur, poste, ancienneté, salaire indiqué, cachet, signature, signataire, date récente.
Compare avec la situation déclarée si elle est fournie.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"attestation_travail","nom_salarie":"","employeur":"","poste":"","date_embauche":"","anciennete_mois":null,"salaire_indique":null,"devise":"XOF|EUR|autre","signataire_nom":"","signataire_fonction":"","cachet_present":false,"signature_presente":false,"date_document":"","recent":false,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
