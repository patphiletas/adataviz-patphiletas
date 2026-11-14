function formatDate(dateString) {
  if (!dateString) return "Date non communiquée";

  const date = new Date(dateString);

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
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

function safeUrl(value) {
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

export function afficherCards(data) {
  const tags = data.qfap_tags
    ? data.qfap_tags.split(";").map(tag => tag.trim())
    : [];
  const dateLisible = formatDate(data.date_start);

  const e = escapeHtml;
  const cover = safeUrl(data.cover_url);

  return `
    <div class="card">
      <button class="audienceBtn">${e(data.audience)}</button>
      <div class="tags">
        ${tags.map(tag => `<span class="tag" data-tag="${e(tag)}">${e(tag)}</span>`).join(" ")}
      </div>
      <h2>${e(data.title)}</h2>
      <h3>${e(data.address_name)}</h3>
      ${cover ? `<img src="${e(cover)}" alt="${e(data.title)}" width="300" loading="lazy">` : ""}
      <p><strong>Date :</strong> ${e(dateLisible)}</p>

      <div class="descriptionHidden hidden">
        <p><strong>Prix :</strong> ${e(data.price_type ?? "Non communiqué")} ${e(data.price_detail)}</p>
        <p>
          <strong>Adresse :</strong>
          ${e(data.address_street)}
          ${e(data.address_zipcode)}
          ${e(data.address_city ?? "Non communiquée")}
        </p>
        <p><strong>Description :</strong> ${e(data.lead_text ?? "Non communiqué")}</p>
        <div class="description">${sanitizeHtml(data.description)}</div>
        <p><strong>Mail :</strong> ${e(data.contact_mail ?? "Non communiqué")}</p>
      </div>
      <button class="toggleDescription">Voir plus</button>
    </div>
  `;
}
// --------------------


let toggleListenerInitialized = false;

export function activerToggleDescription() {
  if (toggleListenerInitialized) return; // Évite les doublons
  
  toggleListenerInitialized = true;
  
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("toggleDescription")) {
      const card = e.target.closest(".card");
      const desc = card.querySelector(".descriptionHidden");

      desc.classList.toggle("hidden");

      e.target.textContent = desc.classList.contains("hidden")
        ? "Voir plus"
        : "Voir moins";
    }
  });
}

// ----------------
// Clear search

document.addEventListener("click", (e) => {
  if (e.target.id === "clear-search") {
    const input = document.getElementById("search");
    if (input) {
      input.value = "";
      input.dispatchEvent(new Event("input")); 
    }
  }
});