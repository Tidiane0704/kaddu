# Kàddu Admin Unified Luxury Pack

Contenu :
- current/assets/css/kaddu-admin-luxury.css
- assets/css/kaddu-admin-luxury.css
- current/assets/js/admin/kaddu-admin-shell.js
- assets/js/admin/kaddu-admin-shell.js
- current/assets/img/logo-kaddu.svg
- assets/img/logo-kaddu.svg
- pages admin existantes reliées au design system
- nouvelles pages :
  - current/admin/admin-marche-locatif.html
  - current/admin/admin-demandes-incidents.html
  - current/admin/admin-verifications-dossiers.html

Toutes les pages admin reçoivent :
- la charte Editorial Luxury,
- bouton retour Hub admin injecté,
- badge Kàddu discret,
- police Playfair Display / DM Sans.

Déploiement :
git add current/admin current/assets/css current/assets/js/admin current/assets/img assets/css assets/js/admin assets/img docs
git commit -m "Apply Kaddù admin editorial luxury design system"
git pull --rebase origin main
git push
