// Accès à l'API Open Data de la Ville de Paris (jeu « que-faire-a-paris- »).
// Le tri, le filtrage et la recherche sont faits par l'API : l'app couvre
// ainsi tous les événements (plus de 3 000), pas seulement une page.

export const API_URL =
  "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records";

export const TAILLE_PAGE = 9;

// Les valeurs insérées dans une requête ODSQL vont entre guillemets doubles :
// on échappe l'antislash et le guillemet pour que la saisie reste du texte.
export function echapperOdsql(texte) {
  return String(texte ?? "").replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// ---------------------------------------------------------------
// Périodes « quand ? », calculées à l'heure de Paris (quel que soit le
// fuseau du navigateur). Renvoie { debut, fin } en ISO avec décalage.

export const PERIODES = ["aujourdhui", "weekend", "semaine"];

const FORMAT_JOUR_PARIS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
});

const FORMAT_DECALAGE_PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  timeZoneName: "longOffset",
});

const JOURS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function jourParis(date) {
  const parts = Object.fromEntries(FORMAT_JOUR_PARIS.formatToParts(date).map((p) => [p.type, p.value]));
  return { annee: +parts.year, mois: +parts.month, jour: +parts.day, jourSemaine: JOURS[parts.weekday] };
}

// Décalage de Paris ce jour-là (« +01:00 » en hiver, « +02:00 » en été).
function decalageParis(annee, mois, jour) {
  const midi = new Date(Date.UTC(annee, mois - 1, jour, 12));
  const nom = FORMAT_DECALAGE_PARIS.formatToParts(midi).find((p) => p.type === "timeZoneName").value;
  return nom === "GMT" ? "+00:00" : nom.replace("GMT", "");
}

function ajouterJours({ annee, mois, jour }, n) {
  const d = new Date(Date.UTC(annee, mois - 1, jour + n));
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
}

function isoParis({ annee, mois, jour }, heure) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${annee}-${pad(mois)}-${pad(jour)}T${heure}${decalageParis(annee, mois, jour)}`;
}

export function periode(quand, maintenant = new Date()) {
  const aujourdhui = jourParis(maintenant);
  let premier;
  let dernier;

  if (quand === "aujourdhui") {
    premier = aujourdhui;
    dernier = aujourdhui;
  } else if (quand === "weekend") {
    // Samedi et dimanche ; si on est déjà le week-end, à partir d'aujourd'hui.
    const versSamedi = aujourdhui.jourSemaine >= 6 ? 0 : 6 - aujourdhui.jourSemaine;
    premier = ajouterJours(aujourdhui, versSamedi);
    dernier = ajouterJours(aujourdhui, 7 - aujourdhui.jourSemaine);
  } else if (quand === "semaine") {
    premier = aujourdhui;
    dernier = ajouterJours(aujourdhui, 6);
  } else {
    return null;
  }

  return { debut: isoParis(premier, "00:00:00"), fin: isoParis(dernier, "23:59:59") };
}

// ---------------------------------------------------------------
// Arrondissements : code postal 750XX (le 16e a aussi 75116).

export function codesPostaux(arrondissement) {
  const n = Number(arrondissement);
  if (!Number.isInteger(n) || n < 1 || n > 20) return [];
  const code = `750${String(n).padStart(2, "0")}`;
  return n === 16 ? [code, "75116"] : [code];
}

// ---------------------------------------------------------------
// Construit la clause `where` :
// - événements en cours ou à venir (pas encore terminés), y compris les
//   expositions commencées avant aujourd'hui ;
// - recherche plein texte (titre, description, lieu, tags…) ;
// - tag exact cliqué sur une carte ;
// - période (« quand ? ») : l'événement doit chevaucher la période ;
// - gratuit (y compris « gratuit sous condition ») ;
// - arrondissement.
export function construireFiltre(
  { recherche = "", tag = "", quand = "", gratuit = false, arrondissement = "" } = {},
  maintenant = new Date()
) {
  const conditions = ["date_end >= now()"];

  const texte = recherche.trim();
  if (texte) conditions.push(`search("${echapperOdsql(texte)}")`);

  const tagPropre = (tag ?? "").trim();
  if (tagPropre) conditions.push(`search(qfap_tags, "${echapperOdsql(tagPropre)}")`);

  const p = periode(quand, maintenant);
  if (p) conditions.push(`date_start <= date'${p.fin}'`, `date_end >= date'${p.debut}'`);

  if (gratuit) conditions.push('price_type in ("gratuit", "gratuit sous condition")');

  const codes = codesPostaux(arrondissement);
  if (codes.length) conditions.push(`address_zipcode in (${codes.map((c) => `"${c}"`).join(", ")})`);

  return conditions.join(" AND ");
}

// Tri par date de fin : ce qui se passe aujourd'hui et les expositions qui
// ferment bientôt d'abord, les expositions permanentes en dernier.
export function construireUrl({ offset = 0, limit = TAILLE_PAGE, ...filtres } = {}, maintenant = new Date()) {
  const params = new URLSearchParams({
    where: construireFiltre(filtres, maintenant),
    order_by: "date_end",
    limit: String(limit),
    offset: String(offset),
  });
  return `${API_URL}?${params}`;
}

// Renvoie { evenements, total }. Lève une erreur si l'API ne répond pas
// correctement, pour que l'interface affiche un message et un bouton « Réessayer ».
export async function chargerEvenements(options = {}, { signal, fetchFn = fetch } = {}) {
  const reponse = await fetchFn(construireUrl(options), { signal });
  if (!reponse.ok) {
    throw new Error(`API Open Data Paris : HTTP ${reponse.status}`);
  }
  const data = await reponse.json();
  return {
    evenements: Array.isArray(data.results) ? data.results : [],
    total: Number(data.total_count) || 0,
  };
}
