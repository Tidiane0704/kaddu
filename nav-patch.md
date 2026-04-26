# Patch — Bouton CONNEXION dans la navigation

## Snippet à insérer dans chaque page

### Dans le `<head>` — script d'auth state (juste avant `</head>`)

```html
<script>
// Kaddu auth state — check session and update nav
(function() {
  try {
    const raw = sessionStorage.getItem('kaddu_jwt');
    if (!raw) return;
    const s = JSON.parse(raw);
    if (Date.now() > s.expires) { sessionStorage.removeItem('kaddu_jwt'); return; }
    // Logged in — swap button after DOM ready
    document.addEventListener('DOMContentLoaded', function() {
      const loginBtn = document.getElementById('nav-login-btn');
      if (!loginBtn) return;
      const meta = s.user?.user_metadata || {};
      const prenom = meta.prenom || s.user?.email?.split('@')[0] || 'Mon espace';
      const href = s.role === 'bailleur' ? '/espace-bailleur/' : '/espace-locataire/';
      loginBtn.href = href;
      loginBtn.textContent = prenom;
      loginBtn.classList.add('logged-in');
    });
  } catch(e) {}
})();
</script>
```

### Dans le HTML — remplacer la div `.nav-cta` existante

**Avant (index.html) :**
```html
<div class="nav-cta">
  <a class="btn btn-secondary" href="/tunnel/dossier-v2-step1.html">Déposer mon dossier</a>
  <a class="btn btn-primary" href="#cta-final">Confier mon bien</a>
</div>
```

**Après :**
```html
<div class="nav-cta">
  <a id="nav-login-btn" class="btn btn-secondary" href="/auth/">Connexion</a>
  <a class="btn btn-primary" href="#cta-final">Confier mon bien</a>
</div>
```

### CSS additionnel (dans `<style>`)

```css
/* Auth nav button — logged in state */
#nav-login-btn.logged-in {
  background: rgba(191,150,80,.12);
  border-color: rgba(191,150,80,.35);
  color: var(--orl);
}
#nav-login-btn.logged-in::before {
  content: '👤 ';
}
```

---

## Pages à patcher

| Fichier | Section nav-cta |
|---------|----------------|
| `current/index.html` | Remplacer `.nav-cta` ligne ~874 |
| `current/proprietaires/index.html` | Remplacer `.nav-cta` |
| `current/biens/index.html` | Remplacer `.nav-cta` |

---

## Notes

- `id="nav-login-btn"` est requis pour que le script de session puisse swapper le bouton
- Quand l'utilisateur est connecté : le bouton affiche son prénom et redirige vers son espace
- Quand déconnecté : le bouton dit "Connexion" et pointe vers `/auth/`
- Le script est non-bloquant (IIFE) et ne casse rien si la session n'existe pas
