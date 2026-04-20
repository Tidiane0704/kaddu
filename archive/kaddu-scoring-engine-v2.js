(function(global){
  const RENT_BY_BIEN = { bantukay: 950000, nopalukay: 975000, suxalikay: 920000 };
  const WEIGHTS = {
    low_income_ratio: -20, expiring_id_under_6m: -15, desired_duration_under_3m: -10,
    no_guarantor_and_independent: -10, generic_email: -5, whatsapp_mismatch: -15,
    non_senegal_resident: -8, employment_under_3m: -10, urgent_move_under_7d: -12,
    many_occupants: -8, hosted_current_housing: -4, no_landlord_reference: -8
  };
  function safeDate(value){ const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
  function daysBetween(fromDate, toDate){ return Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000*60*60*24)); }
  function monthsBetween(fromDate, toDate){ return (toDate.getFullYear()-fromDate.getFullYear())*12 + (toDate.getMonth()-fromDate.getMonth()); }
  function isGenericEmail(email){
    if(!email) return false;
    const domain = String(email).split("@")[1]?.toLowerCase() || "";
    return ["gmail.com","yahoo.com","hotmail.com","outlook.com","icloud.com"].includes(domain);
  }
  function normalizePhone(phone){ return String(phone || "").replace(/[^\d]/g, ""); }
  function collectPayload(){
    return {
      step1: JSON.parse(localStorage.getItem("kaddu_v2_step1") || "{}"),
      step2: JSON.parse(localStorage.getItem("kaddu_v2_step2") || "{}"),
      step3: JSON.parse(localStorage.getItem("kaddu_v2_step3") || "{}"),
      step4: JSON.parse(localStorage.getItem("kaddu_v2_step4") || "{}")
    };
  }
  function computeScore(payload){
    const step1 = payload.step1 || {}, step2 = payload.step2 || {}, step3 = payload.step3 || {};
    const bien = step1.bien || "bantukay";
    const rent = RENT_BY_BIEN[bien] || 0;
    let score = 100;
    const reasons = [], flags = [];
    const revenue = Number(step2.revenu || 0);
    const ratio = revenue > 0 ? rent / revenue : null;
    if (ratio !== null && ratio > 0.4){ score += WEIGHTS.low_income_ratio; reasons.push(`Ratio loyer/revenus élevé (${(ratio*100).toFixed(1)}%)`); flags.push("income_ratio_high"); }
    const entryDate = safeDate(step1.dateEntree), now = new Date();
    if (entryDate){ const daysToEntry = daysBetween(now, entryDate); if (daysToEntry >= 0 && daysToEntry < 7){ score += WEIGHTS.urgent_move_under_7d; reasons.push("Entrée souhaitée très urgente (< 7 jours)"); flags.push("urgent_move"); } }
    const desiredDuration = String(step1.duree || "");
    if (desiredDuration.includes("1 à 3 mois") || desiredDuration.includes("moins de 3 mois")){ score += WEIGHTS.desired_duration_under_3m; reasons.push("Durée souhaitée courte"); flags.push("short_duration"); }
    const residenceCountry = (step2.paysResidence || "").toLowerCase();
    if (residenceCountry && !residenceCountry.includes("sénégal") && !residenceCountry.includes("senegal")){ score += WEIGHTS.non_senegal_resident; reasons.push("Pays de résidence différent du Sénégal"); flags.push("foreign_residence"); }
    const employmentStart = safeDate(step2.dateDebutEmploi);
    if (employmentStart){ const employmentMonths = monthsBetween(employmentStart, now); if (employmentMonths < 3){ score += WEIGHTS.employment_under_3m; reasons.push("Ancienneté dans l'emploi inférieure à 3 mois"); flags.push("employment_short"); } }
    if (String(step2.garant || "") === "Non" && String(step2.situation || "").toLowerCase().includes("indépendant")){ score += WEIGHTS.no_guarantor_and_independent; reasons.push("Indépendant sans garant"); flags.push("independent_no_guarantor"); }
    const occupants = Number(step2.nbOccupants || 0);
    if (occupants >= 4){ score += WEIGHTS.many_occupants; reasons.push("Nombre d'occupants élevé"); flags.push("many_occupants"); }
    if (String(step2.logementActuel || "").toLowerCase().includes("héberg")){ score += WEIGHTS.hosted_current_housing; reasons.push("Logement actuel hébergé"); flags.push("hosted"); }
    const idExpiry = safeDate(step3.dateExpirationPiece);
    if (idExpiry){ const expiryDays = daysBetween(now, idExpiry); if (expiryDays < 180){ score += WEIGHTS.expiring_id_under_6m; reasons.push("Pièce expire dans moins de 6 mois"); flags.push("id_expiring"); } }
    if (!step3.bailleurNom || !step3.bailleurContact){ score += WEIGHTS.no_landlord_reference; reasons.push("Référence locative absente ou incomplète"); flags.push("missing_landlord_ref"); }
    if (isGenericEmail(step1.email)){ score += WEIGHTS.generic_email; reasons.push("Email générique"); flags.push("generic_email"); }
    const phone = normalizePhone(step1.telephone), whatsapp = normalizePhone(step1.numeroWhatsapp);
    if (whatsapp && phone && whatsapp !== phone){ score += WEIGHTS.whatsapp_mismatch; reasons.push("Numéro WhatsApp différent du numéro principal"); flags.push("whatsapp_mismatch"); }
    score = Math.max(0, Math.min(100, score));
    let status = "Faible risque";
    if (score < 50) status = "Risque élevé";
    else if (score < 75) status = "Risque modéré";
    return { score, status, rent, ratio, reasons, flags };
  }
  global.KadduFraudEngine = { RENT_BY_BIEN, WEIGHTS, collectPayload, computeScore };
})(window);
