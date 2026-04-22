(function(global){
  function getConfig(){
    if(!window.KADDU_SUPABASE||!window.KADDU_SUPABASE.url||!window.KADDU_SUPABASE.anonKey) throw new Error("Configuration Supabase absente.");
    return window.KADDU_SUPABASE;
  }
  function randomString(size=6){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let o='';for(let i=0;i<size;i++)o+=c[Math.floor(Math.random()*c.length)];return o;}
  function slugify(v){return String(v||'document').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase();}
  function generateDossierRef(step1){const d=new Date(), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return `KADDU-${y}${m}${day}-${randomString(6)}`;}
  async function uploadSupportingDocument(file,dossierRef,kind){
    const {url,anonKey,bucket}=getConfig(); if(!file) throw new Error('Fichier absent.');
    const ext=(file.name.split('.').pop()||'bin').toLowerCase(); const fileName=`${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/,''))}.${ext}`; const path=`${dossierRef}/${kind}/${fileName}`;
    const endpoint=`${url.replace(/\/$/,'')}/storage/v1/object/${bucket}/${path}`;
    const res=await fetch(endpoint,{method:'POST',headers:{apikey:anonKey,Authorization:`Bearer ${anonKey}`,'x-upsert':'true','Content-Type':file.type||'application/octet-stream'},body:file});
    const text=await res.text(); let data; try{data=text?JSON.parse(text):null}catch(e){data=text} if(!res.ok) throw new Error(typeof data==='string'?data:JSON.stringify(data));
    return {bucket,path,kind,name:file.name,size:file.size,content_type:file.type||null};
  }
  function buildDossierPayload(){
    const step1=JSON.parse(localStorage.getItem("kaddu_v2_step1")||"{}"), step2=JSON.parse(localStorage.getItem("kaddu_v2_step2")||"{}"), step3=JSON.parse(localStorage.getItem("kaddu_v2_step3")||"{}"), step4=JSON.parse(localStorage.getItem("kaddu_v2_step4")||"{}");
    const score=window.KadduV2?window.KadduV2.computeScore():{score:null,reasons:[],ratio:null,status:null,completeness:null};
    return {
      dossier_ref: step4.dossierId || generateDossierRef(step1),
      bien_code: step1.bien || null,
      bien_label: window.KadduV2 ? window.KadduV2.getBienData().label : null,
      loyer_fcfa: window.KadduV2 ? window.KadduV2.getBienData().loyer : null,
      prenom: step1.prenom || null, nom: step1.nom || null, telephone: step1.telephone || null, numero_whatsapp: step1.numeroWhatsapp || null, email: step1.email || null,
      date_naissance: step1.dateNaissance || null, nationalite: step1.nationalite || null, date_entree: step1.dateEntree || null, duree: step1.duree || null,
      situation: step2.situation || null, revenu_mensuel: step2.revenu ? Number(step2.revenu) : null, date_debut_emploi: step2.dateDebutEmploi || null,
      garant: step2.garant || null, employeur: step2.employeur || null, activite: step2.activite || null, source_revenus: step2.sourceRevenus || null, etablissement: step2.etablissement || null, pays_residence: step2.paysResidence || null,
      anciennete_emploi: step3.ancienneteEmploi || null, logement_actuel: step3.logementActuel || null, raison_depart: step3.raisonDepart || null, nb_occupants: step3.nbOccupants ? Number(step3.nbOccupants) : null,
      bailleur_nom: step3.bailleurNom || null, bailleur_contact: step3.bailleurContact || null, garant_nom: step3.garantNom || null, garant_telephone: step3.garantTelephone || null,
      id_type: step4.idType || null, date_expiration_piece: step4.dateExpirationPiece || null, doc_identite_status: step4.docIdentiteStatus || 'missing', doc_revenus_status: step4.docRevenusStatus || 'missing',
      otp_verified: localStorage.getItem("kaddu_otp_verified")==="true", score: score.score ?? null, status: score.status || null, ratio: score.ratio ?? null, dossier_completion: score.completeness ?? null, reasons: score.reasons || [],
      payload: {step1,step2,step3,step4,documents:{identite:step4.docIdentiteMeta||null,revenus:step4.docRevenusMeta||null,iban:step4.docIbanMeta||null}}
    };
  }
  async function saveDossierToSupabase(){
    const {url,anonKey}=getConfig(); const payload=buildDossierPayload(); const endpoint=url.replace(/\/$/,"")+"/rest/v1/dossiers_locataires";
    const res=await fetch(endpoint,{method:"POST",headers:{apikey:anonKey,Authorization:"Bearer "+anonKey,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify(payload)});
    const text=await res.text(); let data=null; try{data=text?JSON.parse(text):null}catch(e){data=text} if(!res.ok) throw new Error(typeof data==="string"?data:JSON.stringify(data)); return data;
  }
  global.KadduSupabaseSave={generateDossierRef,uploadSupportingDocument,buildDossierPayload,saveDossierToSupabase};
})(window);