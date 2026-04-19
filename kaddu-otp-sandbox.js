(function(global){
  const CONFIG = { mode: "mock", defaultMockCode: "123456", storageKey: "kaddu_mock_otp_session" };
  function normalizePhone(phone){ return String(phone || "").replace(/[^\d]/g, ""); }
  function loadSteps(){
    return {
      step1: JSON.parse(localStorage.getItem("kaddu_v2_step1") || "{}"),
      step2: JSON.parse(localStorage.getItem("kaddu_v2_step2") || "{}"),
      step3: JSON.parse(localStorage.getItem("kaddu_v2_step3") || "{}"),
      step4: JSON.parse(localStorage.getItem("kaddu_v2_step4") || "{}")
    };
  }
  function shouldRequireOtp(payload){
    const step1 = payload.step1 || {}, step2 = payload.step2 || {}, step4 = payload.step4 || {};
    const reasons = [];
    const score = Number(step4.score || 100);
    const phone = normalizePhone(step1.telephone), whatsapp = normalizePhone(step1.numeroWhatsapp);
    if (score < 80) reasons.push("score_inferieur_80");
    if (phone && whatsapp && phone !== whatsapp) reasons.push("whatsapp_different");
    const entryDate = step1.dateEntree ? new Date(step1.dateEntree) : null;
    if (entryDate && !isNaN(entryDate.getTime())){
      const now = new Date();
      const days = Math.ceil((entryDate.getTime() - now.getTime()) / (1000*60*60*24));
      if (days >= 0 && days < 7) reasons.push("entree_urgente");
    }
    const country = String(step2.paysResidence || "").toLowerCase();
    if (country && !country.includes("sénégal") && !country.includes("senegal")) reasons.push("hors_senegal");
    return { required: reasons.length > 0, reasons };
  }
  function startOtp(phone){
    const clean = normalizePhone(phone);
    const session = { phone: clean, code: CONFIG.defaultMockCode, createdAt: new Date().toISOString(), verified: false };
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(session));
    return { success: true, phone: clean, code: CONFIG.defaultMockCode };
  }
  function verifyOtp(phone, code){
    const session = JSON.parse(localStorage.getItem(CONFIG.storageKey) || "{}");
    const clean = normalizePhone(phone);
    const ok = session.phone === clean && String(session.code) === String(code).trim();
    if (ok){
      session.verified = true;
      session.verifiedAt = new Date().toISOString();
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(session));
      localStorage.setItem("kaddu_otp_verified", "true");
    }
    return { success: ok, verified: ok };
  }
  function resetOtp(){
    localStorage.removeItem(CONFIG.storageKey);
    localStorage.removeItem("kaddu_otp_verified");
  }
  global.KadduOtpSandbox = { CONFIG, loadSteps, shouldRequireOtp, startOtp, verifyOtp, resetOtp };
})(window);