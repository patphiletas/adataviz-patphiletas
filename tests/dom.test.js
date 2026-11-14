// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { escapeHtml, safeUrl, sanitizeHtml, libelleDate, afficherCards, messageEtat } from "../src/dom.js";

const MAINTENANT = new Date("2026-11-14T12:00:00+01:00");

describe("escapeHtml", () => {
  it("neutralise les caractères HTML", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;"
    );
  });
  it("renvoie une chaîne vide pour null", () => {
    expect(escapeHtml(null)).toBe("");
  });
});

describe("safeUrl", () => {
  it("accepte http et https", () => {
    expect(safeUrl("https://paris.fr/a.jpg")).toBe("https://paris.fr/a.jpg");
  });
  it("refuse javascript: et les valeurs invalides", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("pas une url")).toBe("");
    expect(safeUrl(undefined)).toBe("");
  });
});

describe("sanitizeHtml", () => {
  it("garde la mise en forme autorisée", () => {
    expect(sanitizeHtml("<p>Un <strong>concert</strong></p>")).toBe("<p>Un <strong>concert</strong></p>");
  });
  it("supprime scripts, images et attributs", () => {
    const html = sanitizeHtml('<p onclick="x()">ok</p><script>alert(1)</script><img src=x onerror=alert(1)>');
    expect(html).toBe("<p>ok</p>");
  });
  it("sécurise les liens et retire les liens javascript:", () => {
    expect(sanitizeHtml('<a href="https://paris.fr">site</a>')).toBe(
      '<a href="https://paris.fr/" target="_blank" rel="noopener noreferrer">site</a>'
    );
    expect(sanitizeHtml('<a href="javascript:alert(1)">piège</a>')).toBe("<a>piège</a>");
  });
});

describe("libelleDate", () => {
  it("affiche « En cours » pour un événement commencé et pas fini", () => {
    expect(
      libelleDate({ date_start: "2026-09-01T10:00:00+02:00", date_end: "2027-01-10T18:00:00+01:00" }, MAINTENANT)
    ).toBe("En cours, jusqu'au 10 janvier 2027");
  });
  it("affiche « Le … » pour un événement d'un jour à venir", () => {
    expect(
      libelleDate({ date_start: "2026-11-20T20:00:00+01:00", date_end: "2026-11-20T22:00:00+01:00" }, MAINTENANT)
    ).toBe("Le 20 novembre 2026");
  });
  it("affiche « Du … au … » pour un événement sur plusieurs jours à venir", () => {
    expect(
      libelleDate({ date_start: "2026-12-01T10:00:00+01:00", date_end: "2026-12-05T18:00:00+01:00" }, MAINTENANT)
    ).toBe("Du 1 décembre 2026 au 5 décembre 2026");
  });
  it("affiche « Aujourd'hui » pour ce qui commence ou se termine le jour même", () => {
    expect(
      libelleDate({ date_start: "2026-11-14T20:00:00+01:00", date_end: "2026-11-14T22:00:00+01:00" }, MAINTENANT)
    ).toBe("Aujourd'hui");
    expect(
      libelleDate({ date_start: "2026-11-01T10:00:00+01:00", date_end: "2026-11-14T19:00:00+01:00" }, MAINTENANT)
    ).toBe("Dernier jour : aujourd'hui");
    expect(
      libelleDate({ date_start: "2026-11-14T10:00:00+01:00", date_end: "2026-11-14T13:00:00+01:00" }, MAINTENANT)
    ).toBe("Aujourd'hui");
  });
  it("gère une date absente", () => {
    expect(libelleDate({}, MAINTENANT)).toBe("Date non communiquée");
  });
});

describe("afficherCards", () => {
  it("échappe le titre et les tags venant de l'API", () => {
    const html = afficherCards({ title: "<b>x</b>", qfap_tags: 'Concert;"><script>' });
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;");
    expect(html).not.toContain("<script>");
    expect(html).toContain('data-tag="Concert"');
  });
});

describe("messageEtat", () => {
  it("annonce une erreur avec role=alert et un bouton Réessayer", () => {
    const html = messageEtat("erreur", "Oups", { reessayer: true });
    expect(html).toContain('role="alert"');
    expect(html).toContain('id="reessayer"');
  });
  it("échappe le texte (la recherche de l'utilisateur y apparaît)", () => {
    expect(messageEtat("vide", "« <img src=x> »")).toContain("&lt;img src=x&gt;");
  });
  it("affiche un indicateur pendant le chargement", () => {
    expect(messageEtat("chargement", "Chargement…")).toContain('class="spinner"');
  });
});
