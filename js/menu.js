// ==========================================================================
// MENU BURGER
// Crée le bouton burger dans le <header> et ouvre/ferme le menu sur mobile.
// Ne fait rien sur les pages dont le header n'a pas de <nav>.
// ==========================================================================
(function () {

  const header = document.querySelector("header");
  const nav = header && header.querySelector("nav");
  if (!nav) return;

  const LARGEUR_MOBILE = 760;   // doit être identique à la valeur de css/menu.css

  // Création du bouton (3 barres)
  const burger = document.createElement("button");
  burger.type = "button";
  burger.className = "burger";
  burger.setAttribute("aria-label", "Ouvrir le menu");
  burger.setAttribute("aria-expanded", "false");
  burger.innerHTML = "<span></span><span></span><span></span>";
  header.appendChild(burger);

  function definirOuvert(ouvert) {
    nav.classList.toggle("ouvert", ouvert);
    burger.classList.toggle("ouvert", ouvert);
    burger.setAttribute("aria-expanded", String(ouvert));
    burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
  }

  // Clic sur le burger : ouvre ou ferme
  burger.addEventListener("click", function () {
    definirOuvert(!nav.classList.contains("ouvert"));
  });

  // Clic sur un lien du menu : on ferme (utile pour les liens #ancre)
  nav.addEventListener("click", function (e) {
    if (e.target.closest("a")) definirOuvert(false);
  });

  // Clic en dehors du header, ou touche Échap : on ferme
  document.addEventListener("click", function (e) {
    if (!header.contains(e.target)) definirOuvert(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") definirOuvert(false);
  });

  // Retour à une grande largeur d'écran : on referme
  window.addEventListener("resize", function () {
    if (window.innerWidth > LARGEUR_MOBILE) definirOuvert(false);
  });

})();
