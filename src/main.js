import { chargerEvenements, TAILLE_PAGE } from "./api.js";
import { afficherCards, activerToggleDescription, messageEtat } from "./dom.js";
import { activerTags } from "./event.js";
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

const MIN_VISIBLE_LEVEL_HEIGHT = 260;
const DELAI_RECHERCHE_MS = 300;

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

window.gererTagClick = gererTagClick;

initialiserPage();
synchroniserControles();
activerToggleDescription();
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

  if (reinitialiser) {
    etat.offset = 0;
    mettreAJourUrl();
    liste.innerHTML = messageEtat("chargement", "Chargement des événements…");
    voirPlus.style.display = "none";
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

    const cartes = evenements.map(afficherCards).join("");
    if (reinitialiser) {
      liste.innerHTML = cartes || messageEtat("vide", messageAucunResultat());
    } else {
      liste.insertAdjacentHTML("beforeend", cartes);
    }
    etat.offset += evenements.length;
    afficherCompteur();
    marquerTagActif();
    voirPlus.style.display = etat.offset < etat.total ? "block" : "none";
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
      voirPlus.style.display = "block";
    }
  } finally {
    voirPlus.disabled = false;
    voirPlus.textContent = "Voir plus d'événements";
    requestAnimationFrame(ajusterHeaderSelonHauteur);
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
  if (!compteur) return;
  compteur.textContent = etat.total === 0 ? "" : resumeFiltres(etat.filtres, etat.total);
}

// L'URL reflète les filtres (lien partageable) sans créer d'entrée d'historique.
function mettreAJourUrl() {
  const url = `${window.location.pathname}${ecrireFiltres(etat.filtres)}`;
  window.history.replaceState(null, "", url);
}

// -------------------
// Initialisation de la page

function initialiserPage() {
  const conteneur = document.getElementById('events-container');
  const head = document.getElementById('head');

  head.innerHTML = `
    <div class="content">
    <img src="/logo.png" alt="Logo Paris" id="LogoParis"> 
      <a href="#top" class="headerTitleLink">
        <h1>Que faire à <em>Paris</em> ?</h1>
      </a>

      <div id="search-wrapper" style="position: relative; display: inline-block;">
        
        <input 
          type="text" 
          id="search"
          placeholder="Rechercher..."
          style="
            width: 100%; 
            padding: 8px 35px 8px 12px;
            font-size: 1rem;
            border-radius: 6px;
            border: none;
            outline: none;
            box-sizing: border-box;
            position: center;
          "
        >

        <button 
          id="clear-search"
          style="
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            font-size: 1.1rem;
            cursor: pointer;
            display: none;
          "
        >✕</button>

      </div>

      <button id="reset-filters">Réinitialiser</button>
      <button id="header-toggle" type="button" aria-expanded="true">Réduire l'en-tête</button>
    </div>
  `;

  const boutonsQuand = Object.entries(LIBELLES_QUAND)
    .map(([valeur, libelle]) => `<button type="button" class="filtre-quand" data-quand="${valeur}" aria-pressed="false">${libelle}</button>`)
    .join("");
  const optionsArr = ARRONDISSEMENTS
    .map((arr) => `<option value="${arr}">${libelleArrondissement(arr)} arrondissement</option>`)
    .join("");

  conteneur.innerHTML = `
    <div id="filtres" role="group" aria-label="Filtres">
      <div class="filtres-quand" role="group" aria-label="Quand ?">${boutonsQuand}</div>
      <label class="filtre-gratuit">
        <input type="checkbox" id="filtre-gratuit"> Gratuit
      </label>
      <label class="filtre-arr">
        <span class="sr-only">Arrondissement</span>
        <select id="filtre-arr">
          <option value="">Tous les arrondissements</option>
          ${optionsArr}
        </select>
      </label>
    </div>
    <p id="compteur" aria-live="polite"></p>
    <div id="cards-list" aria-live="polite"></div>
    <button id="voirPlus">Voir plus d'événements</button>
    <button id="debutBtn" style="display: none;">↑ Haut de page</button>
  `;

  // ---------------------

  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear-search");
  
  searchInput.addEventListener("input", (ev) => {
    const value = ev.target.value;
    lancerRecherche(value);
    clearBtn.style.display = value ? "block" : "none";
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    lancerRecherche("");
  });

  // Voir plus
  document.getElementById("voirPlus").addEventListener("click", () => charger({ reinitialiser: false }));

  // Filtres « quand ? », gratuit, arrondissement
  document.getElementById("filtres").addEventListener("click", (event) => {
    const bouton = event.target.closest(".filtre-quand");
    if (!bouton) return;
    etat.filtres.quand = bouton.dataset.quand;
    synchroniserControles();
    charger({ reinitialiser: true });
  });
  document.getElementById("filtre-gratuit").addEventListener("change", (event) => {
    etat.filtres.gratuit = event.target.checked;
    charger({ reinitialiser: true });
  });
  document.getElementById("filtre-arr").addEventListener("change", (event) => {
    etat.filtres.arrondissement = event.target.value;
    charger({ reinitialiser: true });
  });

  // Réessayer après une erreur de chargement
  conteneur.addEventListener("click", (event) => {
    if (event.target.id === "reessayer") charger({ reinitialiser: true });
  });

  // Retour haut de page
  document.getElementById("debutBtn").addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Reset filtres
  document.getElementById("reset-filters").addEventListener("click", resetAffichage);

  const headerToggleBtn = document.getElementById("header-toggle");
  headerToggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    document.body.classList.toggle("header-collapsed");
    updateHeaderToggleState();
    ajusterHeaderSelonHauteur();
  });

  updateHeaderToggleState();
}

// -----------------
// Recherche, tags, réinitialisation

function lancerRecherche(valeur) {
  clearTimeout(minuterieRecherche);
  minuterieRecherche = setTimeout(() => {
    const recherche = valeur.trim();
    if (recherche === etat.filtres.recherche) return;
    etat.filtres.recherche = recherche;
    charger({ reinitialiser: true });
  }, DELAI_RECHERCHE_MS);
}

function gererTagClick(tag) {
  etat.filtres.tag = tag === etat.filtres.tag ? "" : tag;
  window.scrollTo({ top: 0, behavior: "smooth" });
  charger({ reinitialiser: true });
}

function marquerTagActif() {
  document.querySelectorAll(".tag").forEach((tagEl) => {
    tagEl.classList.toggle("active", tagEl.dataset.tag === etat.filtres.tag);
  });
}

// Met les champs (recherche, boutons, case, liste) en accord avec etat.filtres.
function synchroniserControles() {
  const { recherche, quand, gratuit, arrondissement } = etat.filtres;
  const champ = document.getElementById("search");
  champ.value = recherche;
  document.getElementById("clear-search").style.display = recherche ? "block" : "none";
  document.querySelectorAll(".filtre-quand").forEach((bouton) => {
    bouton.setAttribute("aria-pressed", String(bouton.dataset.quand === quand));
  });
  document.getElementById("filtre-gratuit").checked = gratuit;
  document.getElementById("filtre-arr").value = arrondissement;
}

function resetAffichage() {
  clearTimeout(minuterieRecherche);
  etat.filtres = filtresVides();
  synchroniserControles();
  charger({ reinitialiser: true });
}

function getVisibleLevelHeight() {
  const firstCard = document.querySelector("#cards-list .card");
  if (!firstCard) return MIN_VISIBLE_LEVEL_HEIGHT;
  return Math.max(MIN_VISIBLE_LEVEL_HEIGHT, firstCard.getBoundingClientRect().height * 0.75);
}

function updateHeaderToggleState() {
  const btn = document.getElementById("header-toggle");
  if (!btn) return;

  const collapsed = document.body.classList.contains("header-collapsed");
  btn.textContent = collapsed ? "Afficher l'en-tête" : "Réduire l'en-tête";
  btn.setAttribute("aria-expanded", String(!collapsed));
}

function ajusterHeaderSelonHauteur() {
  const head = document.getElementById("head");
  const cardsList = document.getElementById("cards-list");
  const btn = document.getElementById("header-toggle");
  if (!head || !cardsList || !btn) return;

  const visibleLevelHeight = getVisibleLevelHeight();
  const headHeight = head.getBoundingClientRect().height;
  const remainingHeight = window.innerHeight - headHeight;

  const heightIsTight = remainingHeight < visibleLevelHeight;
  document.body.classList.toggle("force-compact-header", heightIsTight);

  if (heightIsTight && !document.body.classList.contains("header-collapsed")) {
    document.body.classList.add("header-collapsed");
  }

  updateHeaderToggleState();
}

window.addEventListener("scroll", () => {
  const btn = document.getElementById("debutBtn");
  if (btn) {
    btn.style.display = window.scrollY > 300 ? "block" : "none";
  }
});

window.addEventListener("resize", ajusterHeaderSelonHauteur);

document.addEventListener("click", (event) => {
  if (event.target.classList?.contains("toggleDescription")) {
    requestAnimationFrame(ajusterHeaderSelonHauteur);
  }
});
