
  
export async function recupererDonnees(limit = 100) {

  try {
    const response = await fetch(
      `https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?limit=${limit}`
    );
    const data = await response.json();
    return data.results;
  } catch (error) {
    console.error('Erreur:', error);
    return [];
  }
}

// ------------------------

// Un seul écouteur pour tous les tags, même ceux ajoutés plus tard :
// évite d'empiler des écouteurs à chaque rendu.
let tagsListenerInitialized = false;

export function activerTags() {
  if (tagsListenerInitialized) return;
  tagsListenerInitialized = true;

  document.addEventListener("click", (event) => {
    const tagEl = event.target.closest?.(".tag");
    if (tagEl) window.gererTagClick(tagEl.dataset.tag);
  });
}
