// ==========================================================================
// BOUTONS "PROPOSER UN GUIDE"
// Chargé sur les pages qui ont un bouton "Proposer un guide" (accueil, fondateurs...).
//
//   - membre connecté  -> va directement sur proposer-guide.html
//   - pas de compte    -> va sur inscription.html (qui le ramène ensuite ici)
//
// Il suffit qu'un lien pointe vers proposer-guide.html : aucun code à ajouter
// sur chaque bouton. Ordre des scripts : supabase-js, supabase-client.js, puis ce fichier.
// ==========================================================================

document.addEventListener("click", async function (e) {

  // Le clic vient-il d'un lien vers proposer-guide.html ?
  const lien = e.target.closest('a[href$="proposer-guide.html"]');
  if (!lien) return;

  // Ctrl/Cmd/Maj + clic (ouverture dans un nouvel onglet) : on ne touche à rien
  if (e.ctrlKey || e.metaKey || e.shiftKey) return;

  // Pas de client Supabase sur cette page : le lien fonctionne normalement
  // et c'est proposer-guide.html qui fera la vérification.
  if (typeof supabaseClient === "undefined") return;

  e.preventDefault();

  let connecte = false;

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    connecte = Boolean(session);
  } catch (erreur) {
    // Doute (hors-ligne...) : on laisse proposer-guide.html décider
    connecte = true;
  }

  window.location.href = connecte
    ? "proposer-guide.html"
    : "inscription.html?redirection=proposer-guide.html";
});
