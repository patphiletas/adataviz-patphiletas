<div align="center">

# Paris Events Explorer

**Explorer les événements à Paris en temps réel à partir de l'Open Data de la Ville de Paris.**

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

Paris Events Explorer est une application front-end en JavaScript qui interroge l'API Open Data de la Ville de Paris pour afficher des événements à venir sous forme de cartes. Le projet permet de rechercher, filtrer et parcourir les événements de manière fluide, avec une interface responsive et un en-tête dynamique.

---

## Fonctionnalités

| Fonctionnalité | Description |
|---|---|
| 🔎 Recherche | Filtrage en direct par titre, description, tags et audience |
| 🏷️ Tags interactifs | Clic sur un tag pour n'afficher que les événements associés |
| 📅 Tri chronologique | Les événements sont triés par date croissante |
| ⏳ Événements à venir | Les événements passés sont exclus de l'affichage |
| ➕ Pagination légère | Chargement progressif avec le bouton `Voir plus d'événements` |
| 📄 Détails dépliables | Informations complémentaires avec `Voir plus` / `Voir moins` |
| 📍 Infos utiles | Date, prix, adresse, description et contact selon les données disponibles |
| 📌 En-tête sticky | Header réductible pour garder plus de place aux cartes |
| 📱 Responsive | Affichage adapté mobile, tablette et desktop |

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | HTML, CSS, JavaScript modulaire |
| Build tool | Vite |
| Données | API Open Data Paris |
| Déploiement | Vercel |

---

## Structure du projet

```text
adataviz-patphiletas/
├── index.html
├── package.json
└── src/
    ├── main.js      # Initialisation, tri, recherche, filtres et pagination
    ├── event.js     # Récupération des données depuis l'API Open Data Paris
    ├── dom.js       # Génération des cartes et interactions UI
    └── style.css    # Mise en page et responsive
```

---

## Source des données

Les données proviennent de l'API publique suivante :

`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records`

L'application consomme directement l'endpoint côté client, sans backend intermédiaire.

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

## Build de production

```bash
npm run build
npm run preview
```

---

## Pistes d'amélioration

- [ ] Ajouter des filtres multicritères plus avancés
- [ ] Mieux gérer les images ou champs manquants
- [ ] Ajouter une carte géographique des événements
- [ ] Permettre le tri par thématique ou par arrondissement
- [ ] Améliorer encore l'accessibilité et la hiérarchie visuelle

---

<div align="center">

Projet développé autour des données ouvertes de la Ville de Paris · Patrice Philétas 2026

</div>
