// ==========================================================================
// REDIRECTION APRÈS CONNEXION / INSCRIPTION
// À charger sur login.html et inscription.html, AVANT le script de la page.
//
// Exemple : inscription.html?redirection=proposer-guide.html
// -> après l'inscription, le membre est envoyé sur proposer-guide.html.
// ==========================================================================

// Seules ces pages sont acceptées comme destination.
// (Sans cette liste, quelqu'un pourrait fabriquer un lien qui renvoie
// les membres vers un site pirate : c'est une faille classique.)
// Pour autoriser une nouvelle page plus tard, ajoute son nom ici.
const PAGES_AUTORISEES = [
  "proposer-guide.html",
  "espace-membre.html",
  "guides.html",
  "fondateurs.html",
  "profils.html"
];

// Page par défaut quand aucune destination n'est demandée
const PAGE_PAR_DEFAUT = "espace-membre.html";

// Lit la destination dans l'adresse. Retourne null si absente ou non autorisée.
function lireRedirection() {
  const demandee = new URLSearchParams(window.location.search).get("redirection");
  return PAGES_AUTORISEES.includes(demandee) ? demandee : null;
}

// Page où envoyer le membre une fois connecté
function destinationApresConnexion() {
  return lireRedirection() || PAGE_PAR_DEFAUT;
}

// Les liens marqués data-garder-redirection (ex : "Déjà un compte ? Se connecter")
// reçoivent la destination, pour qu'elle ne se perde pas en changeant de page.
function conserverRedirection() {
  const redirection = lireRedirection();
  if (!redirection) return;

  document.querySelectorAll("a[data-garder-redirection]").forEach(function (lien) {
    lien.href = lien.getAttribute("href") + "?redirection=" + encodeURIComponent(redirection);
  });

  // Petit message d'explication (affiché seulement si on vient de "Proposer un guide")
  const info = document.getElementById("info-redirection");
  if (info && redirection === "proposer-guide.html") info.hidden = false;
}

conserverRedirection();
