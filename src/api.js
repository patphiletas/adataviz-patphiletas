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

// Construit la clause `where` :
// - événements en cours ou à venir (pas encore terminés), y compris les
//   expositions commencées avant aujourd'hui ;
// - recherche plein texte (titre, description, lieu, tags…) ;
// - tag exact cliqué sur une carte.
export function construireFiltre({ recherche = "", tag = "" } = {}) {
  const conditions = ["date_end >= now()"];

  const texte = recherche.trim();
  if (texte) conditions.push(`search("${echapperOdsql(texte)}")`);

  const tagPropre = tag.trim();
  if (tagPropre) conditions.push(`search(qfap_tags, "${echapperOdsql(tagPropre)}")`);

  return conditions.join(" AND ");
}

// Tri par date de fin : ce qui se passe aujourd'hui et les expositions qui
// ferment bientôt d'abord, les expositions permanentes en dernier.
export function construireUrl({ recherche = "", tag = "", offset = 0, limit = TAILLE_PAGE } = {}) {
  const params = new URLSearchParams({
    where: construireFiltre({ recherche, tag }),
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
