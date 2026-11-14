import { describe, it, expect, vi } from "vitest";
import { echapperOdsql, construireFiltre, construireUrl, chargerEvenements, API_URL, TAILLE_PAGE } from "../src/api.js";

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
