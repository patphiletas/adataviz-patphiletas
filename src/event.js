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
