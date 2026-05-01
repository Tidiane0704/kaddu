
const KADDU_SB_URL = "https://mjrmbnapdpkugkwnbhcz.supabase.co";
const KADDU_SB_ANON = "sb_publishable_zOquxDYzpZ18s_4ALPSHUQ_f85dYwEw";

function formatFcfa(v){
  return Number(v || 0).toLocaleString("fr-FR") + " F CFA";
}

function normalizeType(v){
  v = (v || "").toString().toLowerCase();

  if(v.includes("studio")) return "studio";
  if(v.includes("2")) return "F2";
  if(v.includes("3")) return "F3";
  if(v.includes("4")) return "F4";
  if(v.includes("5")) return "F5+";

  return "studio";
}

function normalizeMeuble(v){
  return v === true || v === "true" || v === "meuble";
}

async function getEstimation(zone_slug, type_bien, meuble){

  const params = new URLSearchParams({
    zone_slug: "eq." + zone_slug,
    type_bien: "eq." + normalizeType(type_bien),
    meuble: "eq." + normalizeMeuble(meuble),
    actif: "eq.true",
    select: "loyer_min,loyer_median,loyer_max"
  });

  const url = `${KADDU_SB_URL}/rest/v1/loyer_reference_zones?${params.toString()}`;

  const res = await fetch(url,{
    headers:{
      apikey: KADDU_SB_ANON,
      Authorization: "Bearer " + KADDU_SB_ANON
    }
  });

  const data = await res.json();
  return data[0] || null;
}

async function updateEstimation(){
  try{
    const zone = window.D?.zone_slug;
    const type = window.D?.pieces;
    const meuble = window.D?.meuble;

    if(!zone || !type) return;

    const row = await getEstimation(zone, type, meuble);

    const box = document.getElementById("estimationBox");
    if(!box) return;

    if(!row){
      box.innerHTML = "Estimation indisponible";
      return;
    }

    box.innerHTML = `
      <div>
        Ce bien pourrait se louer entre 
        <strong>${formatFcfa(row.loyer_min)}</strong> et 
        <strong>${formatFcfa(row.loyer_max)}</strong>
      </div>
      <div style="font-size:12px;opacity:0.6;margin-top:5px">
        Médiane : ${formatFcfa(row.loyer_median)}
      </div>
    `;
  }catch(e){
    console.log(e);
  }
}
