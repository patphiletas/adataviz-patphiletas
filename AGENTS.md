# AGENTS.md — Que faire à Paris ?

Instructions pour tout agent IA (Claude Code ou autre) qui travaille sur ce projet. Mettre à jour ce fichier (et le README si besoin) à chaque changement qui touche l'architecture, la sécurité ou les conventions ci-dessous.

## Le projet en une phrase

Application front-end en **JavaScript vanilla + Vite** qui affiche les événements à venir à Paris à partir de l'API Open Data de la Ville (`que-faire-a-paris-`), avec recherche instantanée, filtre par tag et chargement progressif. Déployée sur Vercel : https://adataviz-patphiletas.vercel.app

**Sans framework, volontairement** : besoin simple, app légère. Ne pas introduire React/Vue/etc. sans le demander à Patrice.

## Structure

```
index.html          # Page unique ; le header et la liste sont générés par src/main.js
src/
  main.js           # Chargement des données, tri/filtre, recherche, tags, pagination, header
  dom.js            # Rendu d'une carte (afficherCards) + échappement/sanitisation HTML
  event.js          # Appel API (recupererDonnees) + délégation des clics sur les tags
  style.css
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

Pas de tests automatisés pour l'instant. Vérifier à la main dans le navigateur : recherche (y compris avec du HTML tapé dans le champ), clic sur un tag puis re-clic, « Voir plus d'événements », « Voir plus / Voir moins » sur une carte.

## Pistes d'évolution notées

Refonte visuelle, filtres « aujourd'hui / ce week-end / gratuit », filtre par arrondissement ou vue carte (lat/lon présents dans les données), états de chargement/erreur, recherche dans l'URL, tests.
