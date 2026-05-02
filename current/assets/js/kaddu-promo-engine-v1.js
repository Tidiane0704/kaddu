/*
  KÀDDU — Moteur promo intelligent + scoring + auto-offre V1
*/

(function(){
  const SB_URL = window.SB_URL || window.SB || "https://mjrmbnapdpkugkwnbhcz.supabase.co";
  const SB_KEY = window.SB_KEY || window.SB_ANON || window.ANON || "sb_publishable_zOquxDYzpZ18s_4ALPSHUQ_f85dYwEw";

  function D(){ window.D = window.D || {}; return window.D; }
  function norm(v){ return String(v || "").trim().toLowerCase(); }

  function param(name){
    return new URLSearchParams(window.location.search).get(name);
  }

  function detectZone(adresse){
    const a = norm(adresse);
    if(a.includes("sipres vdn 2")) return "sipres_vdn_2";
    if(a.includes("sipres") || a.includes("vdn")) return "sipres_vdn";
    if(a.includes("almadies")) return "almadies";
    if(a.includes("ngor")) return "ngor";
    if(a.includes("ouakam")) return "ouakam";
    if(a.includes("mermoz") || a.includes("sacré") || a.includes("sacre")) return "mermoz_sacre_coeur";
    if(a.includes("plateau")) return "plateau";
    if(a.includes("point e") || a.includes("fann")) return "fann_point_e_amitie";
    if(a.includes("yoff")) return "yoff";
    return "";
  }

  function normalizeType(v){
    const s = norm(v);
    if(s.includes("studio")) return "studio";
    if(s.includes("2")) return "F2";
    if(s.includes("3")) return "F3";
    if(s.includes("4")) return "F4";
    if(s.includes("5")) return "F5+";
    return "";
  }

  function context(){
    const d = D();
    return {
      zone_slug: d.zone_slug || detectZone(d.adresse),
      type_bien: d.type_bien || normalizeType(d.pieces),
      meuble: d.meuble === true || d.meuble === "meuble" || d.meuble === "true",
      score: Number(d.owner_score || d.score_bailleur || 0),
      loyer: Number(d.loyer || d.est_median || 0),
      source: d.source || param("utm_source") || param("source") || "",
      besoin: d.besoin || "",
      explicitPromo: String(d.code_promo || param("promo") || param("code") || "").toUpperCase(),
      currentOffer: window.KADDU_SELECTED_OFFER || d.offre || ""
    };
  }

  function recommendOffer(ctx){
    if(ctx.besoin === "expatrie" || ctx.besoin === "multi") return "serenite";
    if(ctx.score >= 82) return "premium";
    if(ctx.score >= 55) return "serenite";
    if(["almadies","ngor","plateau","sipres_vdn","sipres_vdn_2"].includes(ctx.zone_slug)) return "serenite";
    return "essentiel";
  }

  function offerReason(offer){
    if(offer === "premium") {
      return "Votre bien présente un fort potentiel : Kàddu recommande Premium pour accélérer la mise en location et renforcer le suivi.";
    }
    if(offer === "serenite") {
      return "Kàddu recommande Sérénité : le meilleur équilibre entre rendement, sécurité du locataire et tranquillité de gestion.";
    }
    return "Kàddu recommande Essentiel pour tester le marché efficacement tout en gardant la main sur la gestion.";
  }

  function promoMatches(promo, ctx, offer){
    if(!promo || !promo.active) return false;

    const now = new Date().toISOString();

    if(promo.starts_at && promo.starts_at > now) return false;
    if(promo.expires_at && promo.expires_at < now) return false;
    if(promo.usage_limit && Number(promo.usage_count || 0) >= Number(promo.usage_limit)) return false;

    if(promo.ciblage_zone && ctx.zone_slug && promo.ciblage_zone !== ctx.zone_slug) return false;
    if(promo.ciblage_type_bien && ctx.type_bien && promo.ciblage_type_bien !== ctx.type_bien) return false;
    if(promo.source && ctx.source && norm(promo.source) !== norm(ctx.source)) return false;
    if(promo.offre_applicable && offer && norm(promo.offre_applicable) !== norm(offer)) return false;

    return true;
  }

  async function fetchPromos(ctx){
    let query = "select=*&active=eq.true&order=created_at.desc";

    if(ctx.explicitPromo){
      query += "&code=eq." + encodeURIComponent(ctx.explicitPromo);
    }

    const res = await fetch(`${SB_URL}/rest/v1/promo_codes?${query}`, {
      headers: {
        apikey: SB_KEY,
        Authorization: "Bearer " + SB_KEY
      }
    });

    if(!res.ok){
      console.warn("[Kàddu promo] promo_codes inaccessible");
      return [];
    }

    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  }

  function chooseBestPromo(promos, ctx, offer){
    const compatible = promos.filter(p => promoMatches(p, ctx, offer));
    if(!compatible.length) return null;

    compatible.sort((a,b) => {
      const av = a.type === "percent" ? Number(a.value || 0) * 1000 : Number(a.value || 0);
      const bv = b.type === "percent" ? Number(b.value || 0) * 1000 : Number(b.value || 0);
      return bv - av;
    });

    return compatible[0];
  }

  function applyOffer(offer, reason){
    const d = D();
    d.offre_recommandee = offer;
    d.offre_recommandee_raison = reason;

    if(typeof window.selectKadduOffer === "function"){
      window.selectKadduOffer(offer);
    } else {
      window.KADDU_SELECTED_OFFER = offer;
    }

    renderReco(offer, reason);
  }

  function applyPromo(promo){
    const d = D();

    if(!promo){
      d.promo = null;
      return;
    }

    d.promo = promo;
    d.code_promo = promo.code;

    const input = document.getElementById("promo-code") || document.getElementById("promo-code-v2");
    if(input && !input.value) input.value = promo.code;

    const status = document.getElementById("promo-status") || document.getElementById("promo-status-v2");
    if(status){
      const label = promo.type === "percent"
        ? `-${promo.value}%`
        : `-${Number(promo.value || 0).toLocaleString("fr-FR")} F CFA`;

      status.textContent = `Offre appliquée automatiquement : ${promo.code} (${label}).`;
      status.classList.add("ok");
      status.classList.remove("ko");
    }

    if(typeof window.updateKadduOfferSimulation === "function"){
      window.updateKadduOfferSimulation();
    }
  }

  function renderReco(offer, reason){
    let box = document.getElementById("kadduSmartRecoBox");

    if(!box){
      const target =
        document.getElementById("kadduOfferSim") ||
        document.getElementById("ownerScoreCard") ||
        document.querySelector(".kaddu-offer-sim");

      if(!target) return;

      box = document.createElement("div");
      box.id = "kadduSmartRecoBox";
      box.style.cssText = `
        margin:16px 0;
        border:1px solid rgba(191,150,80,.24);
        background:linear-gradient(160deg,rgba(191,150,80,.10),rgba(7,24,43,.68));
        border-radius:16px;
        padding:16px;
        color:#F8F4EE;
      `;
      target.parentNode.insertBefore(box, target);
    }

    const label = {
      essentiel: "Essentiel",
      serenite: "Sérénité",
      premium: "Premium"
    }[offer] || offer;

    box.innerHTML = `
      <div style="font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;color:#DDB96E;margin-bottom:6px">
        Recommandation intelligente Kàddu
      </div>
      <div style="font-family:Georgia,serif;font-size:1.25rem;font-weight:300;margin-bottom:6px">
        Offre recommandée : <em style="color:#BF9650;font-style:italic">${label}</em>
      </div>
      <div style="font-size:.82rem;line-height:1.55;color:rgba(248,244,238,.62)">
        ${reason}
      </div>
    `;
  }

  async function track(eventType, extra = {}){
    const ctx = context();
    const d = D();

    try{
      await fetch(`${SB_URL}/rest/v1/promo_events`, {
        method: "POST",
        headers: {
          apikey: SB_KEY,
          Authorization: "Bearer " + SB_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          event_type: eventType,
          code: d.code_promo || ctx.explicitPromo || null,
          source: ctx.source || null,
          zone_slug: ctx.zone_slug || null,
          type_bien: ctx.type_bien || null,
          offre: window.KADDU_SELECTED_OFFER || d.offre_recommandee || null,
          owner_score: Number(d.owner_score || 0) || null,
          step: Number(window.cs || d.step || 0) || null,
          metadata: extra,
          created_at: new Date().toISOString()
        })
      });
    }catch(e){
      console.warn("[Kàddu promo] tracking failed", e);
    }
  }

  async function run(){
    const ctx = context();
    const offer = recommendOffer(ctx);
    const reason = offerReason(offer);

    applyOffer(offer, reason);

    const promos = await fetchPromos(ctx);
    const promo = chooseBestPromo(promos, ctx, offer);

    if(promo){
      applyPromo(promo);
      track("promo_auto_applied", { promo_id: promo.id, offer });
    } else {
      track("promo_engine_view", { offer });
    }

    return { ctx, offer, reason, promo };
  }

  function patchTracking(){
    if(window.__kadduPromoTrackingPatched) return;
    window.__kadduPromoTrackingPatched = true;

    const originalShowStep = window.showStep;
    if(typeof originalShowStep === "function"){
      window.showStep = function(n){
        const result = originalShowStep.apply(this, arguments);
        track("step_view", { step: n });
        setTimeout(run, 100);
        return result;
      };
    }

    const originalGoMandat = window.goMandat;
    if(typeof originalGoMandat === "function"){
      window.goMandat = function(){
        track("mandat_attempt");
        return originalGoMandat.apply(this, arguments);
      };
    }
  }

  window.KadduPromoEngine = {
    run,
    track,
    recommend: () => {
      const ctx = context();
      const offer = recommendOffer(ctx);
      return { ctx, offer, reason: offerReason(offer) };
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      patchTracking();
      run();
    }, 700);
  });
})();
