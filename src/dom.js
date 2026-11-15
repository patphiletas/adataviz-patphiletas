const FORMAT_DATE = { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" };

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("fr-FR", FORMAT_DATE);
}

// Libellé de date d'une carte :
// - commence aujourd'hui → « Aujourd'hui » ; commencé avant et se termine aujourd'hui → « Dernier jour : aujourd'hui »
// - événement déjà commencé et pas terminé → « En cours, jusqu'au … »
// - événement sur plusieurs jours à venir → « Du … au … »
// - sinon → « Le … »
export function libelleDate(evenement, maintenant = new Date()) {
  const { date_start: debut, date_end: fin } = evenement ?? {};
  if (!debut) return "Date non communiquée";

  const dateDebut = new Date(debut);
  const dateFin = fin ? new Date(fin) : null;

  const aujourdhui = formatDate(maintenant);
  if (formatDate(debut) === aujourdhui) return "Aujourd'hui";
  if (dateFin && dateDebut <= maintenant && dateFin >= maintenant) {
    if (formatDate(fin) === aujourdhui) return "Dernier jour : aujourd'hui";
    return `En cours, jusqu'au ${formatDate(fin)}`;
  }
  if (dateFin && formatDate(debut) !== formatDate(fin)) {
    return `Du ${formatDate(debut)} au ${formatDate(fin)}`;
  }
  return `Le ${formatDate(debut)}`;
}

// -----------------
// Sécurité : tout texte venant de l'API ou de l'utilisateur est échappé
// avant d'être inséré dans le HTML.

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

// La description fournie par l'API contient du HTML : on ne garde qu'une
// liste blanche de balises de mise en forme, sans attributs (sauf href sûr).
const ALLOWED_TAGS = new Set(["P", "BR", "STRONG", "EM", "B", "I", "UL", "OL", "LI", "A", "H3", "H4", "H5", "BLOCKQUOTE", "SUP"]);
const DROPPED_TAGS = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "IMG", "SVG", "FORM", "INPUT", "BUTTON"]);

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;

  function clean(node) {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (DROPPED_TAGS.has(child.tagName)) {
          child.remove();
          continue;
        }
        clean(child);
        if (!ALLOWED_TAGS.has(child.tagName)) {
          child.replaceWith(...child.childNodes);
          continue;
        }
        const href = child.tagName === "A" ? safeUrl(child.getAttribute("href")) : "";
        for (const attr of [...child.attributes]) child.removeAttribute(attr.name);
        if (href) {
          child.setAttribute("href", href);
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
      }
    }
  }

  clean(root);
  return root.innerHTML;
}

// -----------------
// Affichage des cartes

// Colonne de date façon agenda : jour de la semaine, numéro, mois.
// Pour un événement commencé un jour précédent et pas terminé, on affiche la
// date de fin (« jusqu'au »). Un événement qui a commencé aujourd'hui garde sa date.
const FORMAT_COURT = { timeZone: "Europe/Paris" };

export function colonneDate(evenement, maintenant = new Date()) {
  const { date_start: debut, date_end: fin } = evenement ?? {};
  if (!debut) return null;
  const commenceAvantAujourdhui = formatDate(debut) !== formatDate(maintenant) && new Date(debut) < maintenant;
  const enCours = fin && commenceAvantAujourdhui && new Date(fin) >= maintenant;
  const date = new Date(enCours ? fin : debut);
  const morceau = (options) => date.toLocaleDateString("fr-FR", { ...FORMAT_COURT, ...options });
  return {
    haut: enCours ? "jusqu'au" : morceau({ weekday: "short" }).replace(".", ""),
    jour: morceau({ day: "numeric" }),
    bas: morceau({ month: "short" }).replace(".", ""),
  };
}

function prix(data) {
  const type = (data.price_type ?? "").toLowerCase();
  if (type.startsWith("gratuit")) return { texte: type === "gratuit" ? "Gratuit" : "Gratuit sous condition", gratuit: true };
  if (type === "payant") return { texte: "Payant", gratuit: false };
  return null;
}

function arrondissement(codePostal) {
  const m = /^75(?:0(\d\d)|116)$/.exec(codePostal ?? "");
  if (!m) return "";
  const n = m[1] ? Number(m[1]) : 16;
  if (n < 1 || n > 20) return "";
  return n === 1 ? "1er" : `${n}e`;
}

function badgePrix(data) {
  const tarif = prix(data);
  if (!tarif) return "";
  const classe = tarif.gratuit ? "badge-gratuit" : "badge-payant";
  return `<span class="badge ${classe}">${escapeHtml(tarif.texte)}</span>`;
}

// Lien « Voir sur la carte » : seulement si l'événement a des coordonnées.
export function aDesCoordonnees(data) {
  return Number.isFinite(data?.lat_lon?.lat) && Number.isFinite(data?.lat_lon?.lon);
}

function boutonCarte(data) {
  if (!aDesCoordonnees(data)) return "";
  return `<button type="button" class="voir-carte" data-id="${escapeHtml(data.id)}">Voir sur la carte</button>`;
}

function lieuEtArrondissement(data) {
  return [data.address_name, arrondissement(data.address_zipcode)].filter(Boolean).map(escapeHtml).join(" · ");
}

// -----------------
// Vidéos : certaines descriptions intègrent un lecteur YouTube ou Vimeo (<iframe>).
// sanitizeHtml supprime toujours les <iframe> ; on en extrait seulement
// l'identifiant de la vidéo, vérifié par une expression stricte, et on
// reconstruit nous-mêmes le lecteur, chargé au clic (vie privée, performance).

const LECTEURS = [
  { plateforme: "youtube", motif: /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})(?:[?#]|$)/ },
  { plateforme: "vimeo", motif: /^https:\/\/player\.vimeo\.com\/video\/(\d{1,12})(?:[?#]|$)/ },
];

export function extraireVideos(html) {
  const doc = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html");
  const videos = [];
  for (const iframe of doc.querySelectorAll("iframe[src]")) {
    const src = iframe.getAttribute("src").trim();
    for (const { plateforme, motif } of LECTEURS) {
      const m = motif.exec(src);
      if (m && !videos.some((v) => v.id === m[1])) videos.push({ plateforme, id: m[1] });
    }
  }
  return videos;
}

export function urlLecteur({ plateforme, id }) {
  if (plateforme === "youtube" && /^[A-Za-z0-9_-]{11}$/.test(id)) {
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
  }
  if (plateforme === "vimeo" && /^\d{1,12}$/.test(id)) {
    return `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`;
  }
  return "";
}

const NOMS_PLATEFORME = { youtube: "YouTube", vimeo: "Vimeo" };

function blocVideos(videos) {
  return videos
    .map(
      ({ plateforme, id }) => `
      <div class="video">
        <button type="button" class="video-lancer" data-plateforme="${escapeHtml(plateforme)}" data-video="${escapeHtml(id)}">
          <span class="video-icone" aria-hidden="true">▶</span>
          <span>Lire la vidéo <small>· ${NOMS_PLATEFORME[plateforme]}</small></span>
        </button>
      </div>`
    )
    .join("");
}

// -----------------
// Images : celles de paris.fr font souvent 500 Ko à 1 Mo. En production, on les
// fait redimensionner par l'API d'images de Vercel (vercel.json), en AVIF/WebP.
// En cas d'échec, main.js remet l'image d'origine (data-original).

export const LARGEURS_IMAGE = [384, 640, 828];

export function urlImage(url, largeur) {
  return `/_vercel/image?url=${encodeURIComponent(url)}&w=${largeur}&q=70`;
}

function baliseImage(cover, optimiser) {
  const e = escapeHtml;
  if (!optimiser || !cover.startsWith("https://cdn.paris.fr/")) {
    return `<img class="card-image" src="${e(cover)}" alt="" loading="lazy" decoding="async">`;
  }
  const srcset = LARGEURS_IMAGE.map((l) => `${urlImage(cover, l)} ${l}w`).join(", ");
  return `<img class="card-image" src="${e(urlImage(cover, 640))}" srcset="${e(srcset)}" sizes="(max-width: 600px) calc(100vw - 112px), 300px" data-original="${e(cover)}" alt="" loading="lazy" decoding="async">`;
}

// -----------------
// Affichage d'une carte (les détails s'ouvrent dans un encart : afficherFiche)

export function afficherCards(data, maintenant = new Date(), { optimiserImages = false } = {}) {
  const e = escapeHtml;
  const tags = data.qfap_tags ? data.qfap_tags.split(";").map((tag) => tag.trim()).filter(Boolean) : [];
  const cover = safeUrl(data.cover_url);
  const col = colonneDate(data, maintenant);
  const lieu = lieuEtArrondissement(data);

  return `
    <article class="card">
      <div class="date-col" aria-hidden="true">
        ${col ? `<span>${e(col.haut)}</span><b>${e(col.jour)}</b><span>${e(col.bas)}</span>` : ""}
      </div>
      <div class="card-corps">
        ${cover ? `<div class="card-visuel" data-id="${e(data.id)}">${baliseImage(cover, optimiserImages)}</div>` : ""}
        <h2 title="${e(data.title)}">${e(data.title)}</h2>
        <p class="meta">${lieu ? `<strong>${lieu}</strong><br>` : ""}<span class="date">${e(libelleDate(data, maintenant))}</span></p>
        <div class="badges">
          ${badgePrix(data)}
          ${tags.map((tag) => `<button type="button" class="badge tag" data-tag="${e(tag)}" aria-pressed="false">${e(tag)}</button>`).join("")}
        </div>
<div class="actions-carte">
          <button type="button" class="ouvrir-fiche" data-id="${e(data.id)}" aria-haspopup="dialog">${extraireVideos(data.description).length ? "Infos pratiques et vidéo" : "Infos pratiques"}</button>
          ${boutonCarte(data)}
        </div>
      </div>
    </article>
  `;
}

// -----------------
// Contenu de l'encart « Infos pratiques » (élément <dialog> de index.html)

export function afficherFiche(data, maintenant = new Date()) {
  const e = escapeHtml;
  const lieu = lieuEtArrondissement(data);
  const lien = safeUrl(data.url);
  const adresse = [data.address_street, data.address_zipcode, data.address_city].filter(Boolean).map(e).join(" ");

  return `
    <h2 id="fiche-titre">${e(data.title)}</h2>
    <p class="meta">${lieu ? `<strong>${lieu}</strong> · ` : ""}${e(libelleDate(data, maintenant))}</p>
    <div class="badges">${badgePrix(data)}</div>
    ${data.lead_text ? `<p class="accroche">${e(data.lead_text)}</p>` : ""}
    ${blocVideos(extraireVideos(data.description))}
    <dl>
      ${data.audience ? `<dt>Public</dt><dd>${e(data.audience)}</dd>` : ""}
      ${data.price_detail ? `<dt>Tarifs</dt><dd>${sanitizeHtml(data.price_detail)}</dd>` : ""}
      ${adresse ? `<dt>Adresse</dt><dd>${adresse}</dd>` : ""}
    </dl>
    <div class="description">${sanitizeHtml(data.description)}</div>
    <p class="fiche-lien">
      ${lien ? `<a href="${e(lien)}" target="_blank" rel="noopener noreferrer">Voir la fiche complète sur paris.fr ↗</a>` : ""}
      ${boutonCarte(data)}
    </p>
  `;
}

// --------------------
// Messages d'état (chargement, erreur, aucun résultat) affichés à la place des cartes

export function messageEtat(type, texte, { reessayer = false, reinitialiser = false } = {}) {
  const role = type === "erreur" ? "alert" : "status";
  return `
    <div class="etat etat-${escapeHtml(type)}" role="${role}">
      ${type === "chargement" ? '<span class="spinner" aria-hidden="true"></span>' : ""}
      <p>${escapeHtml(texte)}</p>
      ${reessayer ? '<button type="button" id="reessayer">Réessayer</button>' : ""}
      ${reinitialiser ? '<button type="button" id="etat-reinitialiser">Tout effacer</button>' : ""}
    </div>
  `;
}
