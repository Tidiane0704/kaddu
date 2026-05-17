# Kàddu — Dossiers locataires V2 visible

Ce pack corrige la précédente livraison : la V2 n'est plus seulement injectée en modal cachée, elle devient visible dans la page principale.

## Inclus
- interface principale restylée Editorial Luxury ;
- ancien panneau latéral masqué ;
- clic sur une ligne dossier => ouverture directe de la modal Shield V2 ;
- conservation du rendu détail existant en arrière-plan pour ne pas casser les fonctions ;
- boutons Analyser dossier / Analyser pièce dans la modal ;
- suppression de l'injection du shell admin sur cette page pour éviter les superpositions de logo/hub.

## Test après push
1. Ouvrir `/admin/admin-dossiers-v3-secured.html?v=dossiersv2-visible`.
2. Cliquer sur un dossier.
3. Vérifier que la grande modal centrale s'ouvre.
4. Tester fermeture : X, overlay, touche ESC.
5. Vérifier console navigateur.
