<div align="center">

# On sort ?

**Les sorties à Paris, en cours et à venir, d'après les données ouvertes de la Ville.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://adataviz-patphiletas.vercel.app/)
&nbsp;
[![JavaScript](https://img.shields.io/badge/JavaScript-ESModules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=000)](https://developer.mozilla.org/fr/docs/Web/JavaScript)
&nbsp;
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
&nbsp;
[![Open Data Paris](https://img.shields.io/badge/API-Open%20Data%20Paris-1d4ed8?style=for-the-badge)](https://opendata.paris.fr/)

</div>

---

## Aperçu

On sort ? est une application front-end en JavaScript qui interroge l'API Open Data de la Ville de Paris pour afficher **tous les événements en cours ou à venir** (plus de 3 000) sous forme de cartes. La recherche, le filtre par tag et la pagination sont faits par l'API : rien n'est limité à un échantillon chargé dans le navigateur.

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔎 Recherche | Recherche plein texte côté API (titre, description, lieu, tags…) sur tous les événements, déclenchée 300 ms après la frappe |
| 🏷️ Tags interactifs | Clic sur un tag pour filtrer (combinable avec la recherche), re-clic pour l'enlever |
| 📅 Quand ? | Toutes dates / Aujourd'hui / Ce week-end / 7 prochains jours (calculés à l'heure de Paris) |
| 🆓 Gratuit | N'affiche que les événements gratuits (y compris « gratuit sous condition ») |
| 📍 Arrondissement | Filtre du 1er au 20e (le 16e couvre 75016 et 75116) |
| 🔗 Lien partageable | Recherche et filtres sont repris dans l'URL, ex. `?q=jazz&quand=weekend&gratuit=1&arr=11` |
| 🔢 Compteur | Nombre d'événements et rappel des filtres actifs, ex. « 28 événements · ce week-end · gratuits · 11e » |
| 📅 Ce qui se passe maintenant d'abord | Tri par date de fin : événements du jour et expositions qui ferment bientôt en tête |
| ⏳ En cours ou à venir | Les événements terminés sont exclus ; les expositions déjà commencées restent visibles (« En cours, jusqu'au … », « Dernier jour : aujourd'hui ») |
| ➕ Pagination | `Voir plus d'événements` charge les 9 suivants depuis l'API |
| ⏱️ États | Messages de chargement, d'erreur (avec bouton `Réessayer`) et d'absence de résultat |
| 📄 Infos pratiques | Encart (`<dialog>` natif) avec le titre complet, public, tarifs, adresse, description et lien vers paris.fr ; fermeture par ✕, Échap ou clic à côté ; sur mobile, feuille depuis le bas de l'écran |
| ▶️ Vidéos | Les 110 vidéos YouTube et Vimeo intégrées dans les descriptions sont reprises dans l'encart : bouton « Lire la vidéo », lecteur chargé seulement au clic (YouTube sans cookie, Vimeo sans suivi) ; la carte affiche « Infos pratiques et vidéo » |
| 🗺️ Vue carte | Bouton « Liste / Carte » ; tous les événements filtrés sur un plan OpenStreetMap (Leaflet), regroupés quand ils sont proches ; rouge = gratuit, bleu = payant ; un clic sur un point ouvre l'encart ; vue gardée dans l'URL (`vue=carte`) ; Leaflet chargé seulement en vue carte |
| 🌙 Mode nuit | Bouton soleil / lune en haut à droite ; suit d'abord le réglage de l'appareil, puis retient le choix (localStorage) ; appliqué avant l'affichage, sans flash clair |
| 🖱️ Survol | Au survol d'une carte, l'image grossit légèrement dans son cadre et le titre passe en rouge ; un clic sur l'image ouvre l'encart (effet désactivé si « réduire les animations » est activé) |
| 💶 Prix en couleur | « Gratuit » en rouge, « Payant » en bleu |
| 🖼️ Images allégées | En production, les images de paris.fr (souvent 500 Ko à 1 Mo) sont redimensionnées et converties en AVIF/WebP par l'API d'images de Vercel (`vercel.json`), avec retour à l'originale en cas d'échec |
| ⚡ Performance | Lighthouse mobile en production : performance 97, accessibilité 100, bonnes pratiques 100, SEO 100 ; hauteur réservée pour éviter que la page saute à l'arrivée des cartes |
| 🔗 Partage | Icône d'onglet, image d'aperçu (Open Graph, 1200×630), `robots.txt` et `sitemap.xml` |
| 📍 Infos utiles | Date, prix, adresse, description et contact selon les données disponibles |
| 📌 Filtres toujours visibles | La barre de filtres reste en haut de l'écran pendant le défilement ; sur mobile elle défile horizontalement |
| 📱 Responsive | Affichage adapté mobile, tablette et desktop |

---

## Nom

L'app s'appelait « Que faire à Paris ? », comme le jeu de données… et comme le site officiel de la Ville (quefaire.paris.fr). Pour éviter toute confusion, elle a été renommée **On sort ?** le 2026-11-14. C'est un projet indépendant, sans lien avec la Ville de Paris ; le jeu de données « Que faire à Paris ? » est cité comme source en pied de page (licence ODbL). Le dépôt et l'adresse (`adataviz-patphiletas`) n'ont pas changé.

---

## Design

Direction **éditoriale**, façon agenda de magazine culturel : papier crème, encre, rouge d'accent, colonne de date (jour de la semaine, numéro, mois) à gauche de chaque événement. Peu de filets : aucun sous l'en-tête, un filet clair sous la barre de filtres et au-dessus du pied ; les cartes sont séparées par l'espace. Titres en graisse moyenne, coupés à 3 lignes (titre complet dans l'encart et en infobulle).

| Élément | Choix |
|---|---|
| Titrage | Fraunces (variable, romain + italique) |
| Texte | Inter (variable) |
| Polices | Hébergées avec l'app via `@fontsource-variable` (aucun appel à Google Fonts) |
| Couleurs | Variables CSS dans `src/style.css` (`--papier`, `--encre`, `--rouge`, `--bleu`, `--gris`, `--filet`) ; contrastes du texte ≥ 4,5:1 |
| Accessibilité | Lien d'évitement, focus visibles, tags et filtres en `<button>` avec `aria-pressed`, encart `<dialog>` modal (focus piégé puis rendu au bouton), compteur annoncé (`aria-live`) |

L'app est indépendante : pas de logo de la Ville ni d'image de banque d'images ; la source des données est citée en pied de page (Open Data Paris, licence ODbL).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | HTML, CSS, JavaScript modulaire (sans framework) |
| Polices | Fraunces + Inter (`@fontsource-variable`) |
| Build tool | Vite |
| Données | API Open Data Paris (requêtes ODSQL) |
| Carte | Leaflet + leaflet.markercluster, fond OpenStreetMap |
| Tests | Vitest + jsdom |
| Déploiement | Vercel |

---

## Structure du projet

```text
adataviz-patphiletas/
├── index.html       # Page, balises de partage (Open Graph), icônes
├── vercel.json      # Redimensionnement des images de cdn.paris.fr (API d'images Vercel)
├── package.json
├── public/          # favicon.svg, apple-touch-icon.png, og.png, robots.txt, sitemap.xml
├── src/
│   ├── api.js       # Requêtes ODSQL, périodes à l'heure de Paris, codes postaux, appel à l'API
│   ├── carte.js     # Vue carte : Leaflet + regroupement, chargé à la demande
│   ├── theme.js     # Mode nuit : thème initial, bouton soleil / lune
│   ├── filtres.js   # Filtres ↔ URL, libellés, résumé du compteur
│   ├── main.js      # État de la liste, recherche, filtres, tags, pagination, états, en-tête
│   ├── dom.js       # Rendu des cartes, libellés de date, messages d'état, échappement HTML
│   ├── event.js     # Délégation des clics sur les tags
│   └── style.css    # Mise en page et responsive
└── tests/
    ├── api.test.js  # Filtres, périodes (week-end, heure d'été…), échappement ODSQL, erreurs HTTP
    ├── filtres.test.js # Lecture/écriture des filtres dans l'URL, résumé du compteur
    └── dom.test.js  # Échappement/sanitisation, libellés et colonne de date, cartes, encart, vidéos, images, messages d'état
```

---

## Source des données

Les données proviennent de l'API publique suivante :

`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records`

L'application consomme directement l'endpoint côté client, sans backend intermédiaire. Chaque requête envoie :

| Paramètre | Valeur |
|---|---|
| `where` | `date_end >= now()` + `search("…")` pour la recherche + `search(qfap_tags, "…")` pour le tag + `date_start <= date'fin' AND date_end >= date'début'` pour la période + `price_type in ("gratuit", "gratuit sous condition")` + `address_zipcode in ("750XX")` |
| `order_by` | `date_end` (ce qui se termine le plus tôt d'abord) |
| `limit` / `offset` | 9 événements par page |

En vue carte, l'app interroge le point d'**export** (`/exports/json`, sans limite de 100) avec les mêmes filtres et seulement `id,title,lat_lon,price_type,address_name` (~150 Ko compressés pour 3 000 événements). La fiche complète d'un point est chargée au clic (`where=id="…"`).

Les textes saisis sont échappés (`\` et `"`) avant d'être placés dans la requête. Une nouvelle recherche annule la requête précédente (`AbortController`) pour qu'une réponse lente n'écrase pas un résultat plus récent. L'API autorise 10 000 appels par jour et par adresse IP.

---

## Installation

```bash
npm install
```

---

## Lancement

```bash
npm run dev
```

Application disponible ensuite sur l'URL fournie par Vite, généralement :

`http://localhost:5173`

---

## Tests

```bash
npm test          # Vitest en mode watch
npx vitest run    # une seule exécution (88 tests)
```

Les tests ne font aucun appel réseau : `fetch` est remplacé par une fonction factice.

---

## Build de production

```bash
npm run build
npm run preview
```

---

## Pistes d'amélioration

- [x] Recherche et pagination sur tous les événements (côté API)
- [x] États de chargement, d'erreur et d'absence de résultat
- [x] Tests automatisés (Vitest)
- [x] Filtres « aujourd'hui / ce week-end / 7 prochains jours », « gratuit », arrondissement
- [x] Recherche et filtres dans l'URL (lien partageable)
- [x] Refonte visuelle (direction éditoriale)
- [x] Favicon, image de partage, robots.txt, sitemap
- [x] Images redimensionnées (performance)
- [x] Vue carte des événements
- [ ] Ajouter une carte géographique des événements
- [ ] Permettre le tri par thématique ou par arrondissement
- [ ] Améliorer encore l'accessibilité et la hiérarchie visuelle

---

<div align="center">

Projet développé autour des données ouvertes de la Ville de Paris · Patrice Philétas 2026

</div>
