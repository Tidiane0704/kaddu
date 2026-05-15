export const studentPrompt = `Tu analyses un certificat de scolarité, une carte étudiante ou un document d'inscription pour Kàddu.
Retourne ce JSON strict :
KADDU_DOC:{"type_document":"certificat_scolarite|carte_etudiant|attestation_inscription|autre","nom":"","prenom":"","etablissement":"","niveau":"","annee_scolaire":"","date_fin_estimee":"","bourse":false,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
