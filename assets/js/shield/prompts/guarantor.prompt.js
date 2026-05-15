export const guarantorPrompt = `Tu analyses un document relatif à un garant pour Kàddu.
Identifie le garant, son lien avec le candidat, son engagement écrit, ses revenus, sa pièce d'identité et sa signature.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"garant","nom_garant":"","prenom_garant":"","lien_candidat":"","type_piece":"","numero_piece":"","revenu_garant":null,"devise":"XOF|EUR|autre","employeur_garant":"","engagement_ecrit_present":false,"signature_presente":false,"piece_identite_presente":false,"justificatif_revenus_present":false,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
