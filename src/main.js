import "@fontsource-variable/fraunces/wght.css";
import "@fontsource-variable/fraunces/wght-italic.css";
import "@fontsource-variable/inter/wght.css";
import "./style.css";

import { chargerEvenement, chargerEvenements, chargerPointsCarte, TAILLE_PAGE } from "./api.js";
import { afficherCards, afficherFiche, messageEtat, urlLecteur } from "./dom.js";
import { activerTags } from "./event.js";
import { activerBoutonTheme } from "./theme.js";
import {
  ARRONDISSEMENTS,
  LIBELLES_QUAND,
  aDesFiltres,
  ecrireFiltres,
  filtresVides,
  libelleArrondissement,
  lireFiltres,
  resumeFiltres,
} from "./filtres.js";

const DELAI_RECHERCHE_MS = 300;

// Les images redimensionnées (/_vercel/image) n'existent qu'une fois déployé sur Vercel.
const OPTIMISER_IMAGES = window.location.hostname.endsWith(".vercel.app");

// État de la liste : les filtres (lus dans l'URL au chargement, pour qu'un
// lien partagé rouvre la même recherche), et ce qui est déjà affiché.
const etat = {
  filtres: lireFiltres(window.location.search),
  offset: 0,
  total: 0,
};

// Chaque nouvelle requête annule la précédente : une réponse lente ne peut
// pas écraser le résultat d'une recherche plus récente.
let controleur = null;
let minuterieRecherche = null;
let moduleCarte = null; // import("./carte.js"), fait une seule fois

// Événements affichés, par identifiant, pour remplir l'encart « Infos pratiques ».
const evenementsAffiches = new Map();

window.gererTagClick = gererTagClick;

initialiserPage();
activerBoutonTheme();
synchroniserControles();
activerTags();
charger({ reinitialiser: true });

// -----------------------
// Chargement depuis l'API

async function charger({ reinitialiser }) {
  const liste = document.getElementById("cards-list");
  const voirPlus = document.getElementById("voirPlus");

  controleur?.abort();
  controleur = new AbortController();
  const { signal } = controleur;

  const enCarte = etat.filtres.vue === "carte";
  document.getElementById("carte").hidden = !enCarte;
  liste.hidden = enCarte;
  if (enCarte) {
    voirPlus.hidden = true;
    mettreAJourUrl();
    return chargerCarte(signal);
  }

  if (reinitialiser) {
    etat.offset = 0;
    mettreAJourUrl();
    liste.setAttribute("aria-busy", "true");
    liste.innerHTML = messageEtat("chargement", "Chargement des événements…");
    voirPlus.hidden = true;
  } else {
    voirPlus.disabled = true;
    voirPlus.textContent = "Chargement…";
  }

  try {
    const { evenements, total } = await chargerEvenements(
      { ...etat.filtres, offset: etat.offset, limit: TAILLE_PAGE },
      { signal }
    );
    etat.total = total;
    if (reinitialiser) evenementsAffiches.clear();
    evenements.forEach((evenement) => evenementsAffiches.set(String(evenement.id), evenement));

    const cartes = evenements
      .map((evenement) => afficherCards(evenement, new Date(), { optimiserImages: OPTIMISER_IMAGES }))
      .join("");
    if (reinitialiser) {
      liste.innerHTML = cartes || messageEtat("vide", messageAucunResultat(), { reinitialiser: true });
    } else {
      liste.insertAdjacentHTML("beforeend", cartes);
    }
    etat.offset += evenements.length;
    afficherCompteur();
    marquerTagActif();
    voirPlus.hidden = etat.offset >= etat.total;
  } catch (erreur) {
    if (erreur.name === "AbortError") return;
    console.error(erreur);
    if (reinitialiser) {
      liste.innerHTML = messageEtat(
        "erreur",
        "Impossible de charger les événements. Vérifiez votre connexion puis réessayez.",
        { reessayer: true }
      );
    } else {
      voirPlus.hidden = false;
    }
  } finally {
    liste.removeAttribute("aria-busy");
    voirPlus.disabled = false;
    voirPlus.textContent = "Voir plus d'événements";
  }
}

function messageAucunResultat() {
  const { recherche } = etat.filtres;
  const autres = aDesFiltres({ ...etat.filtres, recherche: "" });
  if (recherche && autres) {
    return `Aucun événement ne correspond à « ${recherche} » avec ces filtres. Essayez d'en retirer un.`;
  }
  if (recherche) return `Aucun événement à venir ne correspond à « ${recherche} ».`;
  if (autres) return "Aucun événement ne correspond à ces filtres. Essayez d'en retirer un.";
  return "Aucun événement à venir pour le moment.";
}

function afficherCompteur() {
  const compteur = document.getElementById("compteur");
  compteur.textContent = etat.total === 0 ? "" : resumeFiltres(etat.filtres, etat.total);
}

// L'URL reflète les filtres (lien partageable) sans créer d'entrée d'historique.
function mettreAJourUrl() {
  const url = `${window.location.pathname}${ecrireFiltres(etat.filtres)}`;
  window.history.replaceState(null, "", url);
}

// -------------------
// Initialisation de la page : barre de filtres et écouteurs

function initialiserPage() {
  const boutonsQuand = Object.entries(LIBELLES_QUAND)
    .map(
      ([valeur, libelle]) =>
        `<button type="button" class="pastille filtre-quand" data-quand="${valeur}" aria-pressed="false">${libelle}</button>`
    )
    .join("");
  const optionsArr = ARRONDISSEMENTS.map(
    (arr) => `<option value="${arr}">${libelleArrondissement(arr)} arrondissement</option>`
  ).join("");

  document.getElementById("filtres").innerHTML = `
    <div class="filtres-quand" role="group" aria-label="Quand ?">${boutonsQuand}</div>
    <label class="pastille filtre-gratuit">
      <input type="checkbox" id="filtre-gratuit"> Gratuit
    </label>
    <label class="filtre-arr">
      <span class="sr-only">Arrondissement</span>
      <select id="filtre-arr" class="pastille">
        <option value="">Tous les arrondissements</option>
        ${optionsArr}
      </select>
    </label>
    <button type="button" id="reset-filters" class="lien-reset">Tout effacer</button>
    <div class="vues" role="group" aria-label="Affichage">
      <button type="button" class="pastille choix-vue" data-vue="" aria-pressed="true">Liste</button>
      <button type="button" class="pastille choix-vue" data-vue="carte" aria-pressed="false">Carte</button>
    </div>
  `;

  // Recherche : à la frappe (après 300 ms) ou tout de suite avec Entrée / « Chercher »
  const champ = document.getElementById("search");
  const effacer = document.getElementById("clear-search");

  champ.addEventListener("input", () => {
    effacer.hidden = !champ.value;
    lancerRecherche(champ.value);
  });

  document.getElementById("form-recherche").addEventListener("submit", (event) => {
    event.preventDefault();
    lancerRecherche(champ.value, { immediat: true });
  });

  effacer.addEventListener("click", () => {
    champ.value = "";
    effacer.hidden = true;
    champ.focus();
    lancerRecherche("", { immediat: true });
  });

  // Filtres « quand ? », gratuit, arrondissement, tout effacer
  document.getElementById("filtres").addEventListener("click", (event) => {
    const choixVue = event.target.closest(".choix-vue");
    if (choixVue && choixVue.dataset.vue !== etat.filtres.vue) {
      etat.filtres.vue = choixVue.dataset.vue;
      synchroniserControles();
      charger({ reinitialiser: true });
      return;
    }
    const bouton = event.target.closest(".filtre-quand");
    if (!bouton) return;
    etat.filtres.quand = bouton.dataset.quand;
    synchroniserControles();
    charger({ reinitialiser: true });
  });
  document.getElementById("filtre-gratuit").addEventListener("change", (event) => {
    etat.filtres.gratuit = event.target.checked;
    synchroniserControles();
    charger({ reinitialiser: true });
  });
  document.getElementById("filtre-arr").addEventListener("change", (event) => {
    etat.filtres.arrondissement = event.target.value;
    synchroniserControles();
    charger({ reinitialiser: true });
  });
  document.getElementById("reset-filters").addEventListener("click", resetAffichage);

  // Voir plus
  document.getElementById("voirPlus").addEventListener("click", () => charger({ reinitialiser: false }));

  // Boutons des cartes et des messages d'état : « Infos pratiques », « Réessayer », « Tout effacer »
  document.getElementById("cards-list").addEventListener("click", (event) => {
    if (event.target.id === "reessayer") charger({ reinitialiser: true });
    if (event.target.id === "etat-reinitialiser") resetAffichage();
    // Le bouton « Infos pratiques » ou, à la souris, l'image de la carte
    const declencheur = event.target.closest(".ouvrir-fiche, .card-visuel");
    if (declencheur) ouvrirFiche(declencheur.dataset.id);
  });

  // Encart : fermeture par le bouton ✕, par Échap (natif) ou en cliquant à côté
  const fiche = document.getElementById("fiche");
  document.getElementById("fiche-fermer").addEventListener("click", () => fiche.close());
  fiche.addEventListener("click", (event) => {
    if (event.target === fiche) fiche.close();
    const lancer = event.target.closest(".video-lancer");
    if (lancer) lancerVideo(lancer);
  });
  // Fermer l'encart arrête la vidéo (le contenu est vidé)
  fiche.addEventListener("close", () => {
    document.getElementById("fiche-contenu").innerHTML = "";
  });

  // Image redimensionnée indisponible (quota, erreur) : on revient à l'originale
  document.getElementById("cards-list").addEventListener(
    "error",
    (event) => {
      const img = event.target;
      if (img.tagName !== "IMG" || !img.dataset.original) return;
      img.removeAttribute("srcset");
      img.src = img.dataset.original;
      delete img.dataset.original;
    },
    true
  );

  // Retour en haut
  const haut = document.getElementById("debutBtn");
  haut.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    document.getElementById("search").focus({ preventScroll: true });
  });
  window.addEventListener(
    "scroll",
    () => {
      haut.hidden = window.scrollY < 600;
    },
    { passive: true }
  );
}

// -----------------------
// Vue carte : Leaflet est chargé à la première utilisation seulement (moduleCarte).

async function chargerCarte(signal) {
  const compteur = document.getElementById("compteur");
  const liste = document.getElementById("cards-list");
  compteur.textContent = "Chargement de la carte…";
  try {
    moduleCarte ??= import("./carte.js");
    const { creerCarte, afficherPoints, rafraichirTaille } = await moduleCarte;
    await creerCarte(document.getElementById("carte"), { onOuvrir: ouvrirFiche });
    rafraichirTaille();
    const { points, sansAdresse } = await chargerPointsCarte(etat.filtres, { signal });
    afficherPoints(points, { recadrer: Boolean(etat.filtres.arrondissement) || points.length <= 30 });
    const absents = sansAdresse ? ` · ${sansAdresse} sans adresse, visibles en liste` : "";
    compteur.textContent = points.length
      ? `${resumeFiltres(etat.filtres, points.length)} sur la carte${absents}`
      : "";
    if (!points.length) {
      liste.hidden = false;
      liste.innerHTML = messageEtat("vide", messageAucunResultat(), { reinitialiser: true });
    }
  } catch (erreur) {
    if (erreur.name === "AbortError") return;
    console.error(erreur);
    compteur.textContent = "";
    document.getElementById("carte").hidden = true;
    liste.hidden = false;
    liste.innerHTML = messageEtat("erreur", "Impossible de charger la carte. Vérifiez votre connexion puis réessayez.", {
      reessayer: true,
    });
  }
}

// L'élément <dialog> gère le piège du focus, Échap et le retour du focus sur le bouton.
// Depuis la carte, l'événement n'est pas encore chargé en entier : on va le chercher.
async function ouvrirFiche(id) {
  let evenement = evenementsAffiches.get(String(id));
  if (!evenement) {
    try {
      evenement = await chargerEvenement(id);
    } catch (erreur) {
      console.error(erreur);
    }
    if (!evenement) return;
    evenementsAffiches.set(String(id), evenement);
  }
  const fiche = document.getElementById("fiche");
  document.getElementById("fiche-contenu").innerHTML = afficherFiche(evenement);
  fiche.showModal();
  fiche.scrollTop = 0;
}

// Remplace le bouton par le lecteur (YouTube sans cookie ou Vimeo « do not track »).
function lancerVideo(bouton) {
  const src = urlLecteur({ plateforme: bouton.dataset.plateforme, id: bouton.dataset.video });
  if (!src) return;
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Vidéo de l'événement";
  iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  bouton.replaceWith(iframe);
}

// -----------------
// Recherche, tags, réinitialisation

function lancerRecherche(valeur, { immediat = false } = {}) {
  clearTimeout(minuterieRecherche);
  const appliquer = () => {
    const recherche = valeur.trim();
    if (recherche === etat.filtres.recherche) return;
    etat.filtres.recherche = recherche;
    synchroniserControles();
    charger({ reinitialiser: true });
  };
  if (immediat) appliquer();
  else minuterieRecherche = setTimeout(appliquer, DELAI_RECHERCHE_MS);
}

function gererTagClick(tag) {
  etat.filtres.tag = tag === etat.filtres.tag ? "" : tag;
  synchroniserControles();
  document.querySelector(".barre-filtres").scrollIntoView({ behavior: "smooth" });
  charger({ reinitialiser: true });
}

function marquerTagActif() {
  document.querySelectorAll(".tag").forEach((tagEl) => {
    const actif = tagEl.dataset.tag === etat.filtres.tag;
    tagEl.classList.toggle("active", actif);
    tagEl.setAttribute("aria-pressed", String(actif));
  });
}

// Met les champs (recherche, boutons, case, liste) en accord avec etat.filtres.
function synchroniserControles() {
  const { recherche, quand, gratuit, arrondissement } = etat.filtres;
  const champ = document.getElementById("search");
  if (champ.value.trim() !== recherche) champ.value = recherche;
  document.getElementById("clear-search").hidden = !champ.value;
  document.querySelectorAll(".filtre-quand").forEach((bouton) => {
    bouton.setAttribute("aria-pressed", String(bouton.dataset.quand === quand));
  });
  const caseGratuit = document.getElementById("filtre-gratuit");
  caseGratuit.checked = gratuit;
  caseGratuit.closest("label").classList.toggle("active", gratuit);
  const liste = document.getElementById("filtre-arr");
  liste.value = arrondissement;
  liste.classList.toggle("active", Boolean(arrondissement));
  document.getElementById("reset-filters").hidden = !aDesFiltres(etat.filtres);
  document.querySelectorAll(".choix-vue").forEach((bouton) => {
    bouton.setAttribute("aria-pressed", String(bouton.dataset.vue === etat.filtres.vue));
  });
}

function resetAffichage() {
  clearTimeout(minuterieRecherche);
  etat.filtres = { ...filtresVides(), vue: etat.filtres.vue }; // on garde la vue liste/carte
  synchroniserControles();
  charger({ reinitialiser: true });
}
