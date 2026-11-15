// Vue carte (Leaflet + regroupement des marqueurs).
// Ce module est chargé à la demande (import() dans main.js) : la liste
// n'embarque pas Leaflet tant qu'on ne passe pas en vue carte.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

const PARIS = [48.8566, 2.3522];
// Fond OpenStreetMap (gratuit pour un usage modéré, avec mention de la source).
// CARTO a été essayé : ses tuiles exigent désormais une clé d'API.
// L'aspect sobre (gris chaud) et le mode nuit viennent d'un filtre CSS (style.css).
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">contributeurs OpenStreetMap</a>';
const TUILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

let carte = null;
const marqueursParId = new Map(); // pour centrer la carte sur un événement
let groupe = null;

const echapper = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function poserFond() {
  L.tileLayer(TUILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(carte);
}

function icone(point) {
  const gratuit = (point.price_type ?? "").startsWith("gratuit");
  return L.divIcon({
    className: `point ${gratuit ? "point-gratuit" : "point-payant"}`,
    iconSize: [14, 14],
  });
}

let creation = null;

// Crée la carte une seule fois (même si on l'appelle deux fois de suite) ;
// onOuvrir(id) est appelé au clic sur un marqueur.
export function creerCarte(element, options) {
  creation ??= construire(element, options);
  return creation;
}

async function construire(element, { onOuvrir }) {
  // Le module de regroupement attend la variable globale L de Leaflet.
  window.L = L;
  await import("leaflet.markercluster");
  carte = L.map(element, { zoomControl: true, scrollWheelZoom: true }).setView(PARIS, 12);
  poserFond();

  groupe = L.markerClusterGroup({
    showCoverageOnHover: false,
    maxClusterRadius: 45,
    iconCreateFunction: (grappe) => {
      const n = grappe.getChildCount();
      const taille = n < 10 ? 32 : n < 100 ? 38 : 46;
      return L.divIcon({
        html: `<span>${n}</span>`,
        className: "grappe",
        iconSize: [taille, taille],
      });
    },
  });
  groupe.on("click", (e) => onOuvrir(e.layer.options.idEvenement));
  carte.addLayer(groupe);

  return carte;
}

// Cadrage : Paris par défaut (quelques événements sont en banlieue ou plus loin
// et éloigneraient trop la vue) ; on recadre sur les points seulement quand
// ils sont peu nombreux ou filtrés par arrondissement.
export function afficherPoints(points, { recadrer = false } = {}) {
  groupe.clearLayers();
  marqueursParId.clear();
  const marqueurs = points.map((p) =>
    L.marker([p.lat_lon.lat, p.lat_lon.lon], {
      icon: icone(p),
      idEvenement: String(p.id),
      title: p.title ?? "",
      alt: p.title ?? "",
      keyboard: true,
    }).bindTooltip(
      `<strong>${echapper(p.title)}</strong>${p.address_name ? `<br>${echapper(p.address_name)}` : ""}`,
      { direction: "top", offset: [0, -8] }
    )
  );
  marqueurs.forEach((m) => marqueursParId.set(m.options.idEvenement, m));
  groupe.addLayers(marqueurs);
  if (marqueurs.length && recadrer) {
    carte.fitBounds(groupe.getBounds(), { padding: [30, 30], maxZoom: 15 });
  } else {
    carte.setView(PARIS, 12);
  }
}

// À appeler quand le conteneur redevient visible (il était masqué en vue liste).
export function rafraichirTaille() {
  carte?.invalidateSize();
}

// Centre et zoome sur un événement (lien « Voir sur la carte ») : la carte se
// place au niveau de la rue, déplie le regroupement si besoin et affiche le nom.
// Renvoie false si l'événement n'est pas sur la carte (terminé, filtré, sans adresse).
export function centrerSur(id) {
  const marqueur = marqueursParId.get(String(id));
  if (!carte || !marqueur) return false;
  document.querySelectorAll(".point-actif").forEach((el) => el.classList.remove("point-actif"));
  const montrer = () => {
    marqueur.getElement()?.classList.add("point-actif");
    marqueur.openTooltip();
  };
  carte.setView(marqueur.getLatLng(), 17, { animate: false });
  // Au niveau de la rue, le point est en général déjà visible ; sinon (plusieurs
  // événements au même endroit) le regroupement s'ouvre en éventail.
  if (groupe.getVisibleParent(marqueur) === marqueur) montrer();
  else groupe.zoomToShowLayer(marqueur, montrer);
  return true;
}
