export const salaryPrompt = `Tu analyses un bulletin de salaire pour Kàddu.
Extrais le salarié, employeur, période, salaire net, salaire brut, devise, ancienneté, type contrat.
Détecte les incohérences typographiques, montants suspects, SIRET/NINEA absent, périodes incohérentes.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"bulletin_salaire","nom_salarie":"","prenom_salarie":"","employeur":"","siret_ou_ninea":"","poste":"","salaire_net":null,"salaire_brut":null,"devise":"XOF|EUR|autre","periode":"","cumul_net_annuel":null,"anciennete_mois":null,"type_contrat":"","document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
