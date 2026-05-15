export const fraudCrosscheckPrompt = `Tu analyses les écarts entre les documents et les déclarations du candidat.
Retourne des contrôles structurés :
KADDU_CHECKS:[{"control_code":"","label":"","declared_value":null,"extracted_value":null,"result":"ok|warning|ko|unknown","severity":"low|medium|high|critical","score_impact":0,"explanation":""}]
Reste factuel et non accusatoire.`;
