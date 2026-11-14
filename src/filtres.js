// Filtres de la liste et leur place dans l'URL, pour qu'une recherche
// soit partageable : ?q=jazz&tag=Concert&quand=weekend&gratuit=1&arr=11

import { PERIODES } from "./api.js";

export const LIBELLES_QUAND = {
  "": "Toutes dates",
  aujourdhui: "Aujourd'hui",
  weekend: "Ce week-end",
  semaine: "7 prochains jours",
};

export const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => String(i + 1));

export function libelleArrondissement(arr) {
  return arr === "1" ? "1er" : `${arr}e`;
}

export function filtresVides() {
  return { recherche: "", tag: "", quand: "", gratuit: false, arrondissement: "" };
}

// Lit l'URL ; toute valeur inconnue est ignorée (lien modifié à la main).
export function lireFiltres(search) {
  const params = new URLSearchParams(search);
  const quand = params.get("quand") ?? "";
  const arr = params.get("arr") ?? "";
  return {
    recherche: (params.get("q") ?? "").trim(),
    tag: (params.get("tag") ?? "").trim(),
    quand: PERIODES.includes(quand) ? quand : "",
    gratuit: params.get("gratuit") === "1",
    arrondissement: ARRONDISSEMENTS.includes(arr) ? arr : "",
  };
}

// Écrit seulement les filtres actifs ; renvoie "" s'il n'y en a aucun.
export function ecrireFiltres(filtres) {
  const params = new URLSearchParams();
  if (filtres.recherche) params.set("q", filtres.recherche);
  if (filtres.tag) params.set("tag", filtres.tag);
  if (filtres.quand) params.set("quand", filtres.quand);
  if (filtres.gratuit) params.set("gratuit", "1");
  if (filtres.arrondissement) params.set("arr", filtres.arrondissement);
  const texte = params.toString();
  return texte ? `?${texte}` : "";
}

export function aDesFiltres(filtres) {
  return ecrireFiltres(filtres) !== "";
}

// Texte du compteur, ex. « 128 événements · ce week-end · gratuits · 11e ».
export function resumeFiltres(filtres, total) {
  const nombre = total.toLocaleString("fr-FR");
  const s = total > 1 ? "s" : "";
  const morceaux = [];
  if (filtres.quand) morceaux.push(LIBELLES_QUAND[filtres.quand].toLowerCase());
  else morceaux.push("en cours ou à venir");
  if (filtres.gratuit) morceaux.push(`gratuit${s}`);
  if (filtres.arrondissement) morceaux.push(libelleArrondissement(filtres.arrondissement));
  if (filtres.tag) morceaux.push(`tag « ${filtres.tag} »`);
  if (filtres.recherche) morceaux.push(`« ${filtres.recherche} »`);
  return `${nombre} événement${s} · ${morceaux.join(" · ")}`;
}
