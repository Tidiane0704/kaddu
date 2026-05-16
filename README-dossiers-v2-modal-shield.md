# Kàddu — Dossiers locataires V2 Modal Shield Premium

Pack prêt à déposer.

## Fichier principal
`current/admin/admin-dossiers-v3-secured.html`

## Ajouts
- Grande modal centrale premium au clic sur une ligne dossier.
- Tabs : Synthèse, Informations, Solvabilité, Documents, Historique.
- Bouton `Analyser dossier` relié à la fonction existante `lancerAnalyseDossier()`.
- Boutons `Analyser pièce` reliés à la fonction existante `analyserDocIA(url, name)`.
- Conservation du panneau détail existant et du fonctionnel actuel.
- Fermeture par croix, clic overlay ou touche Échap.

## Dépôt
```bash
cp -R ~/Downloads/kaddu-dossiers-v2-modal-shield-pack/* ~/kaddu/
cd ~/kaddu
git add current/admin/admin-dossiers-v3-secured.html README-dossiers-v2-modal-shield.md
git commit -m "Add dossiers modal Shield premium V2"
git push
```

## Tests après Netlify
- Ouvrir `/admin/admin-dossiers-v3-secured.html`
- Cliquer sur une ligne dossier.
- Vérifier ouverture modal.
- Tester `Analyser dossier`.
- Onglet Documents → tester `Analyser pièce`.
