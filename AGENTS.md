# AGENTS.md — Que faire à Paris ?

Instructions pour tout agent IA (Claude Code ou autre) qui travaille sur ce projet. Mettre à jour ce fichier (et le README si besoin) à chaque changement qui touche l'architecture, la sécurité ou les conventions ci-dessous.

## Le projet en une phrase

Application front-end en **JavaScript vanilla + Vite** qui affiche les événements en cours ou à venir à Paris à partir de l'API Open Data de la Ville (`que-faire-a-paris-`), avec recherche, filtre par tag et chargement progressif — **tous faits par l'API**. Déployée sur Vercel : https://adataviz-patphiletas.vercel.app

**Sans framework, volontairement** : besoin simple, app légère. Ne pas introduire React/Vue/etc. sans le demander à Patrice.

## Structure

```
index.html          # Page unique ; le header et la liste sont générés par src/main.js
src/
  api.js            # Requêtes ODSQL (construireFiltre, construireUrl), periode(), codesPostaux(), chargerEvenements
  filtres.js        # Filtres ↔ URL (lireFiltres, ecrireFiltres), libellés, resumeFiltres
  main.js           # État de la liste, recherche (debounce), tags, pagination, états, header
  dom.js            # Rendu d'une carte, libelleDate, messageEtat, échappement/sanitisation HTML
  event.js          # Délégation des clics sur les tags
  style.css
tests/              # Vitest (api.test.js en Node, dom.test.js en jsdom)
public/             # logo, image d'en-tête
docs/               # sujet du projet (PDF), base de données de départ, carte mentale
que-faire-a-paris-.json   # échantillon du jeu de données (référence, non chargé par l'app)
```

`dist/` est généré par `npm run build` et **n'est pas versionné** (Vercel construit le projet lui-même, framework « Vite »).

## Règles de sécurité (ne pas régresser)

Les données viennent d'une API externe et de la saisie utilisateur : **tout texte inséré dans le HTML doit être échappé**.

- Texte simple (titre, adresse, prix, tags, audience, saisie de recherche…) → `escapeHtml()` de `src/dom.js`.
- URL (image de couverture, liens) → `safeUrl()` : seuls `http:` et `https:` passent.
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

## Conventions

- **Tags** : un seul écouteur délégué sur `document` (`activerTags()` dans `event.js`, idempotent). Ne pas réattacher d'écouteurs à chaque rendu : les anciens s'empilaient et un clic déclenchait plusieurs filtrages.
- **Rendu des cartes** : `liste.map(afficherCards).join("")` puis `innerHTML =` (remplacement) ou `insertAdjacentHTML("beforeend", …)` (ajout « Voir plus »).
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

Vérifier aussi à la main dans le navigateur : compteur au chargement, chaque filtre (quand, gratuit, arrondissement) et l'URL qui suit, un lien avec filtres ouvert dans un nouvel onglet, recherche (y compris avec du HTML tapé dans le champ), clic sur un tag puis re-clic, « Voir plus d'événements », « Réinitialiser », « Voir plus / Voir moins » sur une carte, et le message d'erreur (couper le réseau dans les DevTools).

## Pistes d'évolution notées

Refonte visuelle, vue carte (`lat_lon`), accessibilité, Lighthouse, favicon/OG.
