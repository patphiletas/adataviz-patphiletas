import { describe, it, expect } from "vitest";
import { lireFiltres, ecrireFiltres, filtresVides, aDesFiltres, resumeFiltres, libelleArrondissement } from "../src/filtres.js";

describe("lireFiltres", () => {
  it("lit tous les filtres depuis l'URL", () => {
    expect(lireFiltres("?q=jazz&tag=Concert&quand=weekend&gratuit=1&arr=11")).toEqual({
      recherche: "jazz",
      tag: "Concert",
      quand: "weekend",
      gratuit: true,
      arrondissement: "11",
    });
  });

  it("renvoie des filtres vides sans paramètres", () => {
    expect(lireFiltres("")).toEqual(filtresVides());
  });

  it("ignore les valeurs inconnues d'un lien modifié à la main", () => {
    expect(lireFiltres("?quand=demain&gratuit=oui&arr=99")).toEqual(filtresVides());
  });

  it("décode les caractères spéciaux", () => {
    expect(lireFiltres("?q=th%C3%A9%C3%A2tre%20%26%20danse").recherche).toBe("théâtre & danse");
  });
});

describe("ecrireFiltres", () => {
  it("n'écrit que les filtres actifs", () => {
    expect(ecrireFiltres({ ...filtresVides(), quand: "aujourdhui", gratuit: true })).toBe("?quand=aujourdhui&gratuit=1");
  });

  it("renvoie une chaîne vide sans filtre", () => {
    expect(ecrireFiltres(filtresVides())).toBe("");
  });

  it("aller-retour URL → filtres → URL", () => {
    const url = "?q=jazz&tag=Concert&quand=semaine&gratuit=1&arr=16";
    expect(ecrireFiltres(lireFiltres(url))).toBe(url);
  });
});

describe("aDesFiltres", () => {
  it("détecte la présence d'un filtre", () => {
    expect(aDesFiltres(filtresVides())).toBe(false);
    expect(aDesFiltres({ ...filtresVides(), arrondissement: "3" })).toBe(true);
  });
});

describe("resumeFiltres", () => {
  it("sans filtre", () => {
    expect(resumeFiltres(filtresVides(), 3176)).toBe("3\u202f176 événements · en cours ou à venir");
  });

  it("avec filtres, au singulier", () => {
    expect(
      resumeFiltres({ recherche: "jazz", tag: "Concert", quand: "weekend", gratuit: true, arrondissement: "1" }, 1)
    ).toBe("1 événement · ce week-end · gratuit · 1er · tag « Concert » · « jazz »");
  });

  it("accorde « gratuits » au pluriel", () => {
    expect(resumeFiltres({ ...filtresVides(), gratuit: true }, 12)).toBe("12 événements · en cours ou à venir · gratuits");
  });
});

describe("libelleArrondissement", () => {
  it("1er puis 2e, 3e…", () => {
    expect(libelleArrondissement("1")).toBe("1er");
    expect(libelleArrondissement("11")).toBe("11e");
  });
});
