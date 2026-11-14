// Mode nuit : choix mémorisé (localStorage « theme »), sinon réglage de l'appareil.
// index.html applique déjà le thème avant l'affichage (pas de flash blanc) ;
// ce module gère le bouton soleil / lune.

export const CLE_THEME = "theme";

export function themeInitial(stocke, prefereSombre) {
  if (stocke === "dark" || stocke === "light") return stocke;
  return prefereSombre ? "dark" : "light";
}

const COULEUR_BARRE = { light: "#f6f1e7", dark: "#16130f" };

export function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COULEUR_BARRE[theme]);
  const bouton = document.getElementById("bouton-theme");
  if (bouton) {
    const nuit = theme === "dark";
    bouton.setAttribute("aria-pressed", String(nuit));
    bouton.setAttribute("aria-label", nuit ? "Passer en mode jour" : "Passer en mode nuit");
    bouton.textContent = nuit ? "☀" : "☾";
  }
}

export function activerBoutonTheme() {
  const bouton = document.getElementById("bouton-theme");
  appliquerTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  bouton?.addEventListener("click", () => {
    const suivant = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(CLE_THEME, suivant);
    } catch {
      /* navigation privée : le choix ne sera pas retenu */
    }
    appliquerTheme(suivant);
  });
}
