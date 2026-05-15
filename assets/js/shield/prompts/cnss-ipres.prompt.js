export const cnssIpresPrompt = `Tu analyses un relevé CNSS, IPRES ou document de cotisation sociale pour Kàddu.
Vérifie salarié, organisme, employeur, périodes cotisées, interruptions, ancienneté.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"cnss_ipres","organisme":"CNSS|IPRES|autre","nom_salarie":"","numero_assure":"","employeur":"","periode_debut":"","periode_fin":"","nb_mois_cotises":null,"emploi_confirme":false,"anciennete_confirmee":false,"date_document":"","document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
