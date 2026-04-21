(function(global){
  function getConfig(){
    if (!window.KADDU_SUPABASE || !window.KADDU_SUPABASE.url || !window.KADDU_SUPABASE.anonKey){
      throw new Error("Configuration Supabase absente.");
    }
    return window.KADDU_SUPABASE;
  }

  function buildDossierPayload(){
    const step1 = JSON.parse(localStorage.getItem("kaddu_v2_step1") || "{}");
    const step2 = JSON.parse(localStorage.getItem("kaddu_v2_step2") || "{}");
    const step3 = JSON.parse(localStorage.getItem("kaddu_v2_step3") || "{}");
    const step4 = JSON.parse(localStorage.getItem("kaddu_v2_step4") || "{}");

    return {
      bien: step1.bien || null,
      nom: step1.nom || null,
      telephone: step1.telephone || null,
      numero_whatsapp: step1.numeroWhatsapp || null,
      email: step1.email || null,
      date_naissance: step1.dateNaissance || null,
      nationalite: step1.nationalite || null,
      date_entree: step1.dateEntree || null,
      duree: step1.duree || null,
      situation: step2.situation || null,
      revenu_mensuel: step2.revenu ? Number(step2.revenu) : null,
      date_debut_emploi: step2.dateDebutEmploi || null,
      garant: step2.garant || null,
      identite_garant: step2.identiteGarant || null,
      employeur: step2.employeur || null,
      pays_residence: step2.paysResidence || null,
      logement_actuel: step2.logementActuel || null,
      raison_depart: step2.raisonDepart || null,
      nb_occupants: step2.nbOccupants ? Number(step2.nbOccupants) : null,
      id_type: step3.idType || null,
      id_number: step3.idNumber || null,
      date_expiration_piece: step3.dateExpirationPiece || null,
      iban: step3.iban || null,
      bailleur_nom: step3.bailleurNom || null,
      bailleur_contact: step3.bailleurContact || null,
      transmission: step3.transmission || null,
      commentaire: step3.commentaire || null,
      score: step4.score ?? null,
      status: step4.status || null,
      ratio: step4.ratio ?? null,
      flags: step4.flags || [],
      reasons: step4.reasons || [],
      otp_verified: localStorage.getItem("kaddu_otp_verified") === "true",
      payload: { step1, step2, step3, step4 }
    };
  }

  async function saveDossierToSupabase(){
    const { url, anonKey } = getConfig();
    const payload = buildDossierPayload();
    const endpoint = url.replace(/\/$/, "") + "/rest/v1/rental_dossiers";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "apikey": anonKey,
        "Authorization": "Bearer " + anonKey,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch(e) { data = text; }

    if (!res.ok){
      throw new Error(typeof data === "string" ? data : JSON.stringify(data));
    }
    return data;
  }

  global.KadduSupabaseSave = { buildDossierPayload, saveDossierToSupabase };
})(window);
