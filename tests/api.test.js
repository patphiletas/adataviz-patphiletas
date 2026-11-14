import { describe, it, expect, vi } from "vitest";
import {
  echapperOdsql,
  construireFiltre,
  construireUrl,
  chargerEvenements,
  periode,
  codesPostaux,
  API_URL,
  TAILLE_PAGE,
} from "../src/api.js";

// Samedi 14 novembre 2026, 13 h à Paris
const SAMEDI = new Date("2026-11-14T12:00:00Z");
const MERCREDI = new Date("2026-11-18T09:00:00Z");

describe("echapperOdsql", () => {
  it("échappe guillemets et antislashs pour rester dans la chaîne ODSQL", () => {
    expect(echapperOdsql('l"opéra')).toBe('l\\"opéra');
    expect(echapperOdsql("a\\b")).toBe("a\\\\b");
  });

  it("tolère null et undefined", () => {
    expect(echapperOdsql(null)).toBe("");
    expect(echapperOdsql(undefined)).toBe("");
  });
});

describe("construireFiltre", () => {
  it("garde par défaut les événements en cours ou à venir (date de fin)", () => {
    expect(construireFiltre()).toBe("date_end >= now()");
  });

  it("ajoute la recherche plein texte, sans espaces superflus", () => {
    expect(construireFiltre({ recherche: "  jazz " })).toBe('date_end >= now() AND search("jazz")');
  });

  it("ignore une recherche vide ou faite d'espaces", () => {
    expect(construireFiltre({ recherche: "   " })).toBe("date_end >= now()");
  });

  it("filtre sur le champ des tags", () => {
    expect(construireFiltre({ tag: "Concert" })).toBe('date_end >= now() AND search(qfap_tags, "Concert")');
  });

  it("combine recherche et tag", () => {
    expect(construireFiltre({ recherche: "jazz", tag: "Concert" })).toBe(
      'date_end >= now() AND search("jazz") AND search(qfap_tags, "Concert")'
    );
  });

  it("une saisie malveillante ne peut pas sortir de la chaîne", () => {
    const filtre = construireFiltre({ recherche: '") OR (1=1' });
    expect(filtre).toBe('date_end >= now() AND search("\\") OR (1=1")');
  });
});

describe("construireUrl", () => {
  it("pointe vers l'API et trie par date de fin", () => {
    const url = new URL(construireUrl());
    expect(`${url.origin}${url.pathname}`).toBe(API_URL);
    expect(url.searchParams.get("order_by")).toBe("date_end");
    expect(url.searchParams.get("limit")).toBe(String(TAILLE_PAGE));
    expect(url.searchParams.get("offset")).toBe("0");
  });

  it("transmet pagination et filtres, encodés", () => {
    const url = new URL(construireUrl({ recherche: "théâtre & danse", offset: 18, limit: 9 }));
    expect(url.searchParams.get("offset")).toBe("18");
    expect(url.searchParams.get("where")).toBe('date_end >= now() AND search("théâtre & danse")');
  });
});

describe("chargerEvenements", () => {
  it("renvoie les événements et le total", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ total_count: 3176, results: [{ title: "A" }, { title: "B" }] }),
    });
    const res = await chargerEvenements({ recherche: "jazz" }, { fetchFn });
    expect(res).toEqual({ evenements: [{ title: "A" }, { title: "B" }], total: 3176 });
    expect(fetchFn.mock.calls[0][0]).toContain("jazz");
  });

  it("transmet le signal d'annulation à fetch", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ total_count: 0, results: [] }) });
    const { signal } = new AbortController();
    await chargerEvenements({}, { fetchFn, signal });
    expect(fetchFn.mock.calls[0][1]).toEqual({ signal });
  });

  it("lève une erreur si l'API répond en erreur", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(chargerEvenements({}, { fetchFn })).rejects.toThrow("HTTP 503");
  });

  it("supporte une réponse sans résultats", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    expect(await chargerEvenements({}, { fetchFn })).toEqual({ evenements: [], total: 0 });
  });
});

describe("periode (heure de Paris)", () => {
  it("aujourd'hui : de minuit à 23:59:59", () => {
    expect(periode("aujourdhui", MERCREDI)).toEqual({
      debut: "2026-11-18T00:00:00+01:00",
      fin: "2026-11-18T23:59:59+01:00",
    });
  });

  it("ce week-end, un mercredi : samedi et dimanche suivants", () => {
    expect(periode("weekend", MERCREDI)).toEqual({
      debut: "2026-11-21T00:00:00+01:00",
      fin: "2026-11-22T23:59:59+01:00",
    });
  });

  it("ce week-end, un samedi : à partir d'aujourd'hui", () => {
    expect(periode("weekend", SAMEDI)).toEqual({
      debut: "2026-11-14T00:00:00+01:00",
      fin: "2026-11-15T23:59:59+01:00",
    });
  });

  it("ce week-end, un dimanche : seulement aujourd'hui", () => {
    expect(periode("weekend", new Date("2026-11-15T10:00:00Z"))).toEqual({
      debut: "2026-11-15T00:00:00+01:00",
      fin: "2026-11-15T23:59:59+01:00",
    });
  });

  it("utilise le jour de Paris, pas celui du fuseau UTC (dimanche 23 h 30 UTC = lundi à Paris)", () => {
    expect(periode("aujourdhui", new Date("2026-11-15T23:30:00Z")).debut).toBe("2026-11-16T00:00:00+01:00");
  });

  it("7 prochains jours : aujourd'hui + 6 jours", () => {
    expect(periode("semaine", MERCREDI)).toEqual({
      debut: "2026-11-18T00:00:00+01:00",
      fin: "2026-11-24T23:59:59+01:00",
    });
  });

  it("gère le passage à l'heure d'été", () => {
    expect(periode("weekend", new Date("2026-03-25T12:00:00Z"))).toEqual({
      debut: "2026-03-28T00:00:00+01:00",
      fin: "2026-03-29T23:59:59+02:00",
    });
  });

  it("renvoie null sans période ou pour une valeur inconnue", () => {
    expect(periode("", MERCREDI)).toBeNull();
    expect(periode("demain", MERCREDI)).toBeNull();
  });
});

describe("codesPostaux", () => {
  it("convertit un arrondissement en code postal", () => {
    expect(codesPostaux("1")).toEqual(["75001"]);
    expect(codesPostaux("20")).toEqual(["75020"]);
  });
  it("le 16e a deux codes postaux", () => {
    expect(codesPostaux("16")).toEqual(["75016", "75116"]);
  });
  it("ignore les valeurs hors 1–20", () => {
    expect(codesPostaux("")).toEqual([]);
    expect(codesPostaux("21")).toEqual([]);
    expect(codesPostaux('1") OR ("')).toEqual([]);
  });
});

describe("construireFiltre avec les filtres du lot 2", () => {
  it("période : l'événement doit chevaucher la période", () => {
    expect(construireFiltre({ quand: "aujourdhui" }, MERCREDI)).toBe(
      "date_end >= now() AND date_start <= date'2026-11-18T23:59:59+01:00' AND date_end >= date'2026-11-18T00:00:00+01:00'"
    );
  });

  it("gratuit inclut « gratuit sous condition »", () => {
    expect(construireFiltre({ gratuit: true })).toBe(
      'date_end >= now() AND price_type in ("gratuit", "gratuit sous condition")'
    );
  });

  it("arrondissement", () => {
    expect(construireFiltre({ arrondissement: "16" })).toBe(
      'date_end >= now() AND address_zipcode in ("75016", "75116")'
    );
  });

  it("combine tous les filtres", () => {
    const filtre = construireFiltre(
      { recherche: "jazz", tag: "Concert", quand: "weekend", gratuit: true, arrondissement: "11" },
      MERCREDI
    );
    expect(filtre.split(" AND ")).toHaveLength(7);
    expect(filtre).toContain('address_zipcode in ("75011")');
  });
});
