# AGENTS.md — On sort ?

Instructions pour tout agent IA (Claude Code ou autre) qui travaille sur ce projet. Mettre à jour ce fichier (et le README si besoin) à chaque changement qui touche l'architecture, la sécurité ou les conventions ci-dessous.

## Le projet en une phrase

**Nom : « On sort ? »** (renommé le 2026-11-14 : « Que faire à Paris ? » est le nom du site officiel de la Ville, quefaire.paris.fr). Ne pas réutiliser l'ancien nom ni l'identité visuelle de la Ville ; le jeu de données « que-faire-a-paris- » reste cité comme source en pied de page, avec la mention « Projet indépendant, sans lien avec la Ville de Paris ».

Application front-end en **JavaScript vanilla + Vite** qui affiche les événements en cours ou à venir à Paris à partir de l'API Open Data de la Ville (`que-faire-a-paris-`), avec recherche, filtre par tag et chargement progressif — **tous faits par l'API**. Déployée sur Vercel : https://adataviz-patphiletas.vercel.app

**Sans framework, volontairement** : besoin simple, app légère. Ne pas introduire React/Vue/etc. sans le demander à Patrice.

## Structure

```
index.html          # Page unique : en-tête, recherche, conteneurs (filtres, liste), pied de page
src/
  api.js            # Requêtes ODSQL (construireFiltre, construireUrl), periode(), codesPostaux(), chargerEvenements
  carte.js          # Vue carte : Leaflet + markercluster (import() à la demande), fond OSM
  theme.js          # Mode nuit (themeInitial, appliquerTheme, activerBoutonTheme)
  filtres.js        # Filtres ↔ URL (lireFiltres, ecrireFiltres), libellés, resumeFiltres
  main.js           # Imports polices/CSS, état de la liste, recherche (debounce), filtres, tags, pagination, états
  dom.js            # Rendu d'une carte, libelleDate, messageEtat, échappement/sanitisation HTML
  event.js          # Délégation des clics sur les tags
  style.css
tests/              # Vitest (api.test.js en Node, dom.test.js en jsdom)
public/             # favicon.svg, apple-touch-icon.png, og.png (1200×630), robots.txt, sitemap.xml
vercel.json         # API d'images Vercel : tailles 384/640/828, qualité 70, hôte cdn.paris.fr
docs/               # sujet du projet (PDF), base de données de départ, carte mentale
que-faire-a-paris-.json   # échantillon du jeu de données (référence, non chargé par l'app)
```

`dist/` est généré par `npm run build` et **n'est pas versionné** (Vercel construit le projet lui-même, framework « Vite »).

## Règles de sécurité (ne pas régresser)

Les données viennent d'une API externe et de la saisie utilisateur : **tout texte inséré dans le HTML doit être échappé**.

- Texte simple (titre, adresse, prix, tags, audience, saisie de recherche…) → `escapeHtml()` de `src/dom.js`.
- URL (image de couverture, liens) → `safeUrl()` : seuls `http:` et `https:` passent.
- Vidéos : `sanitizeHtml()` supprime **toujours** les `<iframe>`. `extraireVideos()` lit seulement l'identifiant (YouTube `embed/` 11 caractères, Vimeo `player.vimeo.com/video/` chiffres) avec une expression stricte ; `urlLecteur()` reconstruit l'URL (youtube-nocookie, Vimeo `dnt=1`) et `main.js` crée l'`<iframe>` au clic. Ne jamais réinsérer l'iframe d'origine ni élargir la liste des hôtes sans test.
- Champ `description` de l'API (contient du HTML) → `sanitizeHtml()` : liste blanche de balises de mise en forme, attributs supprimés, liens forcés en `target="_blank" rel="noopener noreferrer"`. Ne jamais l'insérer brut.
- Ne jamais réintroduire de `${variable}` non échappé dans un template HTML, ni d'`innerHTML +=` dans une boucle (construire la chaîne puis l'insérer en une fois).

Historique : le 2026-11-14, la recherche permettait d'injecter du HTML (`« ${query} »` dans le message « aucun résultat ») et la description de l'API était insérée telle quelle. Corrigé dans le commit « Sécurité : échappement… ».

## Données : règles à respecter

- **Ne jamais filtrer ni trier côté navigateur** une page de résultats : l'API contient plus de 3 000 événements. Tout passe par `construireFiltre()` / `construireUrl()` dans `src/api.js` (bug corrigé le 2026-11-14 : l'app ne chargeait que 100 événements et masquait les expositions déjà commencées).
- Critère « à venir » = `date_end >= now()` (pas `date_start`), tri `order_by=date_end`.
- Toute valeur insérée dans une requête ODSQL passe par `echapperOdsql()`.
- Chaque chargement annule le précédent (`AbortController` dans `charger()` de `main.js`) ; la recherche attend 300 ms après la frappe.
- Les filtres vivent dans `etat.filtres` (`main.js`) : `{ recherche, tag, quand, gratuit, arrondissement }`. Ils sont lus depuis l'URL au chargement et réécrits avec `history.replaceState` à chaque chargement. `synchroniserControles()` remet les champs en accord avec l'état. Tout nouveau filtre : l'ajouter à `filtresVides`, `lireFiltres`, `ecrireFiltres`, `resumeFiltres` et `construireFiltre`, avec des tests.
- Les périodes (« aujourd'hui », « ce week-end », « 7 prochains jours ») sont calculées **à l'heure de Paris** dans `periode()`, quel que soit le fuseau du navigateur ; un événement est retenu s'il chevauche la période.
- Erreur réseau/HTTP → `chargerEvenements` lève une erreur → message `messageEtat("erreur", …, { reessayer: true })`.

## Design (direction éditoriale, choisie le 2026-11-14)

- Variables de couleur dans `:root` de `src/style.css` : `--papier`, `--encre`, `--rouge` (Gratuit, accents), `--bleu` (Payant), `--gris`, `--filet`. Ne pas introduire de couleur en dur ; vérifier tout nouveau contraste de texte (≥ 4,5:1).
- Mode nuit : `:root[data-theme="dark"]` redéfinit les variables (papier encre, accents éclaircis, contrastes ≥ 4,5:1 vérifiés). Le script en ligne dans `<head>` (index.html) pose `data-theme` avant l'affichage ; `src/theme.js` gère le bouton et `localStorage` (« theme »). Toute nouvelle couleur doit passer par une variable, sinon elle ne s'inversera pas. Exception voulue : le bloc vidéo reste noir dans les deux thèmes.
- Polices auto-hébergées via `@fontsource-variable/fraunces` (titres) et `@fontsource-variable/inter` (texte), importées en tête de `main.js`. Pas de Google Fonts (vie privée).
- Une carte = `<article class="card">` : colonne de date (`colonneDate()`), image 3:2, titre serif graisse 500 coupé à 3 lignes (`line-clamp`, titre complet en `title`), lieu · arrondissement, libellé de date, badges (prix + tags en `<button>`), bouton « Infos pratiques ».
- « Infos pratiques » ouvre l'encart `<dialog id="fiche">` (index.html) rempli par `afficherFiche()` depuis `evenementsAffiches` (Map par `id`, dans `main.js`). Ne pas revenir à un dépliage dans la carte : il décalait toute la rangée suivante.
- Survol : `.card:hover .card-image` (zoom 1.04 dans `.card-visuel` en `overflow: hidden`) et titre rouge, seulement si `@media (hover: hover)`, coupé par `prefers-reduced-motion`. Un clic sur `.card-visuel` (data-id) ouvre l'encart.
- Peu de filets : pas de filet sous les cartes (séparées par l'espace, `gap` de la grille).
- Pas de logo « Mairie de Paris » ni d'image de banque d'images (l'ancienne était une « Preview » AdobeStock filigranée, non licenciée) : l'app est indépendante, la source est citée en pied de page.
- Mobile (< 600 px) : la barre de filtres défile horizontalement ; vérifier qu'aucun élément ne fait déborder la page (`document.documentElement.scrollWidth` = largeur d'écran).

## Vue carte (ajoutée le 2026-11-14)

- `etat.filtres.vue` = `""` (liste) ou `"carte"` ; dans l'URL `vue=carte`. Ce n'est pas un filtre : `aDesFiltres` l'ignore et « Tout effacer » garde la vue.
- Données : `chargerPointsCarte()` (point d'export, mêmes filtres, peu de champs, `pointsValides()` écarte les événements sans coordonnées, comptés à part) ; `chargerEvenement(id)` pour l'encart ouvert depuis un marqueur.
- `src/carte.js` est importé dynamiquement (chunk séparé, ~45 Ko gzip) ; `leaflet.markercluster` attend `window.L`, d'où son `import()` après `window.L = L`. `creerCarte()` est idempotent.
- Fond de plan : **OpenStreetMap** (`tile.openstreetmap.org`, attribution obligatoire, usage modéré). CARTO a été essayé : ses tuiles affichent désormais « API KEY REQUIRED ». L'aspect sobre et le mode nuit sont un `filter` CSS sur `.leaflet-tile-pane` (pas de second fond de plan).
- « Voir sur la carte » : `etat.filtres.evenement` (URL `evenement=<id>`, lu seulement si `vue=carte` et numérique ; ni compté comme filtre ni gardé hors vue carte, effacé dès qu'un filtre change). `voirSurLaCarte()` fait un `pushState` puis bascule ; un écouteur `popstate` relit l'adresse (retour → liste). `centrerSur(id)` (`carte.js`) : `setView` zoom 17 sans animation, puis tooltip + classe `.point-actif` tout de suite si le point est visible, sinon `zoomToShowLayer` (éventail). Le lien n'existe que si `aDesCoordonnees()`.
- Cadrage : Paris (zoom 12) par défaut ; recadrage sur les points seulement si un arrondissement est filtré ou s'il y a ≤ 30 résultats (quelques événements hors Paris éloigneraient la vue).

## Performance et partage

- Images : `afficherCards(e, maintenant, { optimiserImages })`. En production (`*.vercel.app`), `src`/`srcset` passent par `/_vercel/image?url=…&w=…&q=70` ; `w` doit être dans `LARGEURS_IMAGE` **et** dans `images.sizes` de `vercel.json` (sinon erreur 400), `q` dans `images.qualities`. `data-original` garde l'image d'origine : `main.js` y revient si l'image optimisée échoue (quota du plan Hobby, erreur). En local (Vite), les images d'origine sont utilisées.
- Balises Open Graph et icônes dans `index.html`. `og.png` a été généré en HTML (polices Fraunces/Inter) puis capturé avec Chrome headless en 1200×630 ; le refaire si le titre ou le design change.
- Audits Lighthouse mobile du 2026-11-14 : avant → performance 67 (images de 4 Mo), accessibilité 100, bonnes pratiques 96, SEO 92. Après images optimisées (236 Ko par page), robots.txt et sitemap → performance 72, accessibilité 100, bonnes pratiques 100, SEO 100 ; le reste de la note perf venait d'un décalage de mise en page (CLS 0,70) quand les cartes arrivent, corrigé en réservant la hauteur de `main` (`min-height: 100vh`) et du compteur (1 ligne, 2 sur mobile). Ne pas retirer ces réserves. Résultat final en production (2026-11-14, après vidéos et survol) : **performance 97, accessibilité 100, bonnes pratiques 100, SEO 100** (LCP 2,1 s, CLS 0, 231 Ko).

## Conventions

- **Tags** : un seul écouteur délégué sur `document` (`activerTags()` dans `event.js`, idempotent). Ne pas réattacher d'écouteurs à chaque rendu : les anciens s'empilaient et un clic déclenchait plusieurs filtrages.
- **Rendu des cartes** : `liste.map((e) => afficherCards(e)).join("")` (ne pas passer `afficherCards` directement à `map`, son 2ᵉ paramètre est la date « maintenant ») puis `innerHTML =` (remplacement) ou `insertAdjacentHTML("beforeend", …)` (ajout « Voir plus »).
- Les fonctions appelées depuis le HTML ou d'autres modules sont exposées sur `window` (`gererTagClick`, `filtrerParTag`).
- Code et commentaires en français.

## Commandes

```bash
npm install
npm run dev       # serveur Vite
npm run build     # build de production dans dist/
npm run preview   # sert dist/ en local
```

```bash
npm test          # Vitest (watch)
npx vitest run    # une exécution
```

Ajouter un test pour toute modification de `api.js` (filtre, URL, erreurs) ou de `dom.js` (échappement, dates, cartes). Les tests ne doivent pas appeler le réseau : passer `fetchFn` à `chargerEvenements`.

Vérifier aussi à la main dans le navigateur : compteur au chargement, chaque filtre (quand, gratuit, arrondissement) et l'URL qui suit, un lien avec filtres ouvert dans un nouvel onglet, recherche (y compris avec du HTML tapé dans le champ), clic sur un tag puis re-clic, « Voir plus d'événements », « Tout effacer », l'encart « Infos pratiques » (ouverture, ✕, Échap, clic à côté), l'affichage mobile, et le message d'erreur (couper le réseau dans les DevTools).

## Pistes d'évolution notées

Vue carte (`lat_lon`), audit Lighthouse, favicon et image de partage (OG), animation de 5 s pour le portfolio.
