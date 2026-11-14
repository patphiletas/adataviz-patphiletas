// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { escapeHtml, safeUrl, sanitizeHtml, libelleDate, afficherCards, afficherFiche, messageEtat, colonneDate, urlImage } from "../src/dom.js";

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

describe("colonneDate", () => {
  it("événement à venir : jour de la semaine, numéro et mois du début", () => {
    expect(colonneDate({ date_start: "2026-11-20T20:00:00+01:00", date_end: "2026-11-20T22:00:00+01:00" }, MAINTENANT)).toEqual({
      haut: "ven",
      jour: "20",
      bas: "nov",
    });
  });
  it("événement en cours : « jusqu'au » et la date de fin", () => {
    expect(colonneDate({ date_start: "2026-09-01T10:00:00+02:00", date_end: "2027-01-10T18:00:00+01:00" }, MAINTENANT)).toEqual({
      haut: "jusqu'au",
      jour: "10",
      bas: "janv",
    });
  });
  it("événement commencé aujourd'hui : garde la date du jour", () => {
    expect(colonneDate({ date_start: "2026-11-14T10:00:00+01:00", date_end: "2026-11-14T18:00:00+01:00" }, MAINTENANT)).toEqual({
      haut: "sam",
      jour: "14",
      bas: "nov",
    });
  });
  it("renvoie null sans date", () => {
    expect(colonneDate({}, MAINTENANT)).toBeNull();
  });
});

describe("afficherCards (mise en page éditoriale)", () => {
  const evenement = {
    id: "125022",
    title: "Concert",
    address_name: "Le Lieu",
    address_zipcode: "75011",
    price_type: "gratuit sous condition",
    price_detail: '<p class="text">Sur réservation</p><script>alert(1)</script>',
    date_start: "2026-11-20T20:00:00+01:00",
    date_end: "2026-11-20T22:00:00+01:00",
    url: "javascript:alert(1)",
    qfap_tags: "Concert;Jazz",
  };
  const html = afficherCards(evenement, MAINTENANT);

  it("affiche l'arrondissement à partir du code postal", () => {
    expect(html).toContain("Le Lieu · 11e");
    expect(afficherCards({ ...evenement, address_zipcode: "75116" }, MAINTENANT)).toContain("Le Lieu · 16e");
    expect(afficherCards({ ...evenement, address_zipcode: "92100" }, MAINTENANT)).not.toContain(" · 92");
  });

  it("signale la gratuité en rouge et le payant en bleu", () => {
    expect(html).toContain('class="badge badge-gratuit">Gratuit sous condition');
    expect(afficherCards({ ...evenement, price_type: "payant" }, MAINTENANT)).toContain('class="badge badge-payant">Payant');
    expect(afficherCards({ ...evenement, price_type: null }, MAINTENANT)).not.toContain("badge-payant");
  });

  it("garde le titre complet en infobulle (le titre affiché est coupé à 3 lignes)", () => {
    expect(afficherCards({ ...evenement, title: 'Long "titre"' }, MAINTENANT)).toContain('title="Long &quot;titre&quot;"');
  });

  it("rend les tags cliquables au clavier (boutons)", () => {
    expect(html).toContain('<button type="button" class="badge tag" data-tag="Jazz" aria-pressed="false">Jazz</button>');
  });

  it("ouvre les infos pratiques dans un encart (bouton avec l'identifiant)", () => {
    expect(html).toContain('class="ouvrir-fiche" data-id="125022" aria-haspopup="dialog"');
    expect(html).not.toContain("<details");
  });
});

describe("afficherFiche (encart Infos pratiques)", () => {
  const evenement = {
    title: "Concert <b>",
    address_name: "Le Lieu",
    address_zipcode: "75011",
    address_street: "1 rue X",
    address_city: "Paris",
    audience: "Tout public.",
    price_type: "payant",
    price_detail: '<p class="text">De 10 à 32 euros.</p><script>alert(1)</script>',
    lead_text: "Une soirée.",
    description: '<p>Texte <img src=x onerror=alert(1)></p>',
    date_start: "2026-11-20T20:00:00+01:00",
    date_end: "2026-11-20T22:00:00+01:00",
    url: "https://www.paris.fr/evenements/x-1",
  };
  const html = afficherFiche(evenement, MAINTENANT);

  it("affiche le titre complet, échappé, comme titre de l'encart", () => {
    expect(html).toContain('<h2 id="fiche-titre">Concert &lt;b&gt;</h2>');
  });

  it("filtre le HTML des tarifs et de la description", () => {
    expect(html).toContain("<dd><p>De 10 à 32 euros.</p></dd>");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onerror");
  });

  it("donne les infos pratiques et le lien paris.fr", () => {
    expect(html).toContain("<dt>Public</dt><dd>Tout public.</dd>");
    expect(html).toContain("<dt>Adresse</dt><dd>1 rue X 75011 Paris</dd>");
    expect(html).toContain('href="https://www.paris.fr/evenements/x-1"');
  });

  it("refuse un lien javascript:", () => {
    expect(afficherFiche({ ...evenement, url: "javascript:alert(1)" }, MAINTENANT)).not.toContain("javascript:");
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
  it("propose de tout effacer quand il n'y a aucun résultat", () => {
    expect(messageEtat("vide", "Rien", { reinitialiser: true })).toContain('id="etat-reinitialiser"');
  });
  it("affiche un indicateur pendant le chargement", () => {
    expect(messageEtat("chargement", "Chargement…")).toContain('class="spinner"');
  });
});

describe("images redimensionnées", () => {
  const evenement = { title: "X", cover_url: "https://cdn.paris.fr/qfapv4/2026/05/26/huge-abc.jpg" };

  it("construit l'URL de l'API d'images de Vercel", () => {
    expect(urlImage("https://cdn.paris.fr/a b.jpg", 640)).toBe("/_vercel/image?url=https%3A%2F%2Fcdn.paris.fr%2Fa%20b.jpg&w=640&q=70");
  });

  it("utilise srcset et garde l'originale en secours quand l'optimisation est active", () => {
    const html = afficherCards(evenement, MAINTENANT, { optimiserImages: true });
    expect(html).toContain("&amp;w=384&amp;q=70 384w");
    expect(html).toContain('data-original="https://cdn.paris.fr/qfapv4/2026/05/26/huge-abc.jpg"');
  });

  it("garde l'image d'origine hors production ou pour un autre domaine", () => {
    expect(afficherCards(evenement, MAINTENANT)).not.toContain("_vercel");
    expect(afficherCards({ ...evenement, cover_url: "https://autre.fr/a.jpg" }, MAINTENANT, { optimiserImages: true })).not.toContain("_vercel");
  });
});
