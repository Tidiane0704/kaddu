(function(window){
  const KadduV2 = {
    bienMap:{
      bantukay:{label:'Le Petit Bantukay',loyer:950000,meta:'Sipres VDN 2 · F3 meublé'},
      nopalukay:{label:'Le Petit Nopalukay',loyer:975000,meta:'Sipres VDN 2 · F3 meublé'},
      suxalikay:{label:'Le Petit Suxalikay',loyer:920000,meta:'Sipres VDN 2 · F3 meublé'}
    },
    getBien(){const qp=new URLSearchParams(location.search);const bien=qp.get('bien')||localStorage.getItem('kaddu_selected_bien')||'bantukay';localStorage.setItem('kaddu_selected_bien',bien);return bien;},
    getBienData(){return this.bienMap[this.getBien()]||this.bienMap.bantukay;},
    setHeader(){const b=this.getBienData();const a=document.getElementById('bienLabel');if(a)a.textContent=b.label+' · '+b.meta;const r=document.getElementById('bienRent');if(r)r.textContent=Number(b.loyer||0).toLocaleString('fr-FR')+' FCFA / mois';},
    saveStep(step,data){localStorage.setItem('kaddu_v2_'+step,JSON.stringify(data));},
    loadStep(step){try{return JSON.parse(localStorage.getItem('kaddu_v2_'+step)||'{}')}catch(e){return {}}},
    normalizePhone(v){return String(v||'').replace(/[^\d+]/g,'');},
    isGenericEmail(e){return /@(gmail|yahoo|outlook|hotmail)\./i.test(String(e||''));},
    isDisposableEmail(e){return /@(mailinator|yopmail|guerrillamail|tempmail)\./i.test(String(e||''));},
    estimateOtpDecision(s1){const reasons=[];const tel=this.normalizePhone(s1.telephone), wa=this.normalizePhone(s1.numeroWhatsapp||s1.telephone); if(tel&&wa&&tel!==wa)reasons.push('numéro WhatsApp différent'); if(this.isDisposableEmail(s1.email))reasons.push('email temporaire'); if((s1.duree||'').includes('1 à 3'))reasons.push('séjour court à confirmer'); return {required:reasons.length>0,reasons};},
    computeCompleteness(){const s1=this.loadStep('step1'),s2=this.loadStep('step2'),s3=this.loadStep('step3'),s4=this.loadStep('step4'); const checks=[!!s1.prenom,!!s1.nom,!!s1.telephone,!!s1.email,!!s1.dateEntree,!!s1.duree,!!s2.situation,!!s2.revenu,!!s2.paysResidence,!!s3.logementActuel,!!s3.nbOccupants,['ok','deferred'].includes(s4.docIdentiteStatus),['ok','deferred'].includes(s4.docRevenusStatus)]; return Math.round((checks.filter(Boolean).length/checks.length)*100);},
    computeScore(){const s1=this.loadStep('step1'),s2=this.loadStep('step2'),s3=this.loadStep('step3'),s4=this.loadStep('step4'); let score=100; const reasons=[]; const revenu=Number(s2.revenu||0), loyer=this.getBienData().loyer, ratio=revenu?loyer/revenu:null;
      if(localStorage.getItem('kaddu_otp_verified')!=='true'){score-=12;reasons.push('Téléphone à vérifier manuellement');}
      if(s1.numeroWhatsapp&&this.normalizePhone(s1.numeroWhatsapp)!==this.normalizePhone(s1.telephone)){score-=8;reasons.push('Téléphone et WhatsApp différents');}
      if(this.isDisposableEmail(s1.email)){score-=25;reasons.push('Email temporaire détecté');} else if(this.isGenericEmail(s1.email)){score-=3;reasons.push('Email grand public');}
      if(ratio!==null){if(ratio>0.5){score-=22;reasons.push('Ratio loyer / revenus élevé');} else if(ratio>0.4){score-=10;reasons.push('Ratio loyer / revenus à surveiller');}}
      if(s2.situation==='Indépendant'&&s2.garant==='Non'){score-=10;reasons.push('Profil indépendant sans garant');}
      if(s2.situation==='Étudiant'&&s2.garant!=='Oui'){score-=20;reasons.push('Étudiant sans garant');}
      if((s2.paysResidence||'').toLowerCase()&&!/senegal|sénégal/.test((s2.paysResidence||'').toLowerCase())){score-=5;reasons.push('Résidence hors Sénégal');}
      if((s3.ancienneteEmploi||'')==='Moins de 6 mois'){score-=10;reasons.push('Ancienneté professionnelle récente');}
      if((s3.logementActuel||'')==='Hébergé'){score-=5;reasons.push('Situation d’hébergement à clarifier');}
      if(Number(s3.nbOccupants||0)>=5){score-=5;reasons.push('Nombre d’occupants élevé');}
      if(s3.bailleurApplicable==='yes'&&!s3.bailleurContact){score-=10;reasons.push('Référence bailleur absente');}
      if(s4.docIdentiteStatus==='missing'){score-=20;reasons.push('Pièce d’identité manquante');}
      if(s4.docRevenusStatus==='missing'){score-=15;reasons.push('Justificatif de revenus manquant');}
      if(s4.idExpiryRisk){score-=12;reasons.push('Pièce bientôt expirée');}
      score=Math.max(0,Math.min(100,Math.round(score)));
      return {score,reasons,ratio,status:score>=80?'Dossier fluide':score>=60?'Vérification manuelle':'Dossier à consolider',completeness:this.computeCompleteness()};
    }
  };
  window.KadduV2=KadduV2;
})(window);