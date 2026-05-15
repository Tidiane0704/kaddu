export const identityPrompt = `Tu analyses une pièce d'identité pour l'agence immobilière Kàddu (Sénégal).
Le document peut être une CNI sénégalaise, un passeport, un titre de séjour ou une pièce étrangère.

INSTRUCTIONS :
- Pour un passeport, lis impérativement la MRZ.
- Vérifie nom, prénom, date de naissance, nationalité, numéro, expiration.
- Signale les incohérences sans accuser.
- Identifie la lisibilité, l'origine du document et les éventuels signaux de manipulation.

Retourne ce JSON strict :
KADDU_DOC:{"type_document":"cni|passeport|titre_sejour|autre","nom":"","prenom":"","date_naissance":"","nationalite":"","numero_piece":"","date_expiration":"","pays_emetteur":"","valide":false,"mrz_lue":false,"document_origin":"pdf_native|scan|screenshot|photo|unknown","proof_strength":"strong|medium|weak","tampering_signals":[],"lisibilite":"bonne|moyenne|mauvaise","confidence":0,"anomalies":[]}
Après le JSON, synthèse courte.`;
