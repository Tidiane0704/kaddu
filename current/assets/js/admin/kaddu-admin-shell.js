
(function(){
  const path = window.location.pathname || "";
  const isAdmin = path.includes("/admin/");
  if(!isAdmin) return;

  document.body.classList.add("kaddu-admin-luxury");
  document.body.setAttribute("data-kaddu-admin-shell","true");

  const isHub = /\/admin\/?$|\/admin\/index\.html$/.test(path);
  if(!isHub && !document.querySelector(".kaddu-admin-hub-return")){
    const a = document.createElement("a");
    a.className = "kaddu-admin-hub-return";
    a.href = "/admin/";
    a.innerHTML = '<span class="mark">←</span><span>Hub admin</span>';
    document.body.appendChild(a);
  }

  if(!document.querySelector(".kaddu-admin-logo-mini") && !isHub){
    const badge = document.createElement("div");
    badge.className = "kaddu-admin-logo-mini";
    badge.innerHTML = '<img src="/assets/img/logo-kaddu.svg" alt="Kàddu" onerror="this.style.display=\'none\'"><span><strong>Kàddu</strong><br>la parole qui engage</span>';
    document.body.appendChild(badge);
  }

  // Répare quelques cartes du hub qui ouvraient uniquement des panneaux internes.
  document.addEventListener("click", function(e){
    const card = e.target.closest && e.target.closest("a.module-card[data-admin-target]");
    if(card){
      const target = card.getAttribute("data-admin-target");
      if(target){ window.location.href = target; }
    }
  });
})();
