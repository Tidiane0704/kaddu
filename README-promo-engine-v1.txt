# KÀDDU — Moteur promo intelligent + scoring + auto-offre V1

## 1. Déposer le JS

Déposer :

`kaddu-promo-engine-v1.js`

dans :

`/current/assets/js/kaddu-promo-engine-v1.js`

Puis ajouter dans le tunnel bailleur, juste avant `</body>` :

```html
<script src="/assets/js/kaddu-promo-engine-v1.js"></script>
```

## 2. Exécuter le SQL

Exécuter dans Supabase SQL Editor :

`supabase-promo-engine-v1.sql`

Cela crée :
- `promo_events`
- `marketing_automation_rules`

## 3. Fonctionnement

Le moteur :
- lit le contexte du tunnel : zone, type bien, meublé, score, source, besoin ;
- recommande automatiquement l’offre : Essentiel / Sérénité / Premium ;
- cherche un code promo compatible dans `promo_codes` ;
- applique la promo si elle correspond ;
- envoie des événements dans `promo_events`.

## 4. URL promo

Exemple :

`https://kaddu.net/tunnel/bailleur.html?promo=LANCEMENT-VDN&utm_source=TikTok`

## 5. À vérifier

Dans ton tunnel, les variables suivantes doivent idéalement exister :
- `window.D`
- `D.zone_slug`
- `D.pieces`
- `D.meuble`
- `D.owner_score`
- `D.loyer`
- `window.selectKadduOffer()`
- `window.updateKadduOfferSimulation()`

Le moteur prévoit des fallback si certains champs n’existent pas.
