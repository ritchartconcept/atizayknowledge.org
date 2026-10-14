// ==========================================================================
// RÉGLAGES — les seules valeurs que tu as besoin de modifier
// ==========================================================================

// Nombre total de places de contributeur fondateur.
// Si tu changes ce chiffre, change aussi la limite "between 1 and 25" dans le SQL.
const NOMBRE_DE_PLACES = 25;

// true  = lit les fondateurs dans Supabase (table "profils")
// false = affiche seulement la liste de secours ci-dessous
const UTILISER_SUPABASE = true;

// Liste affichée si Supabase est désactivé ou injoignable.
const FONDATEURS_SECOURS = [
  {
    rang: 1,
    nom: "Fritzner Richard",
    discipline: "illustration",
    bio: "Illustrateur et fondateur d'Atizay Knowledge.",
    portfolio: "",
    depuis: null
  }
];

// Noms affichés pour chaque discipline (la valeur vient de l'inscription)
const LABELS_DISCIPLINES = {
  "illustration": "Illustration",
  "bd": "Bande dessinée",
  "manga": "Manga",
  "storyboard": "Storyboard",
  "character-design": "Character design",
  "concept-art": "Concept art",
  "animation2d": "Animation 2D",
  "animation3d": "Animation 3D",
  "art3d": "Art 3D",
  "graffiti": "Graffiti / art urbain",
  "peinture": "Peinture",
  "design": "Design graphique",
  "ui-ux": "Design UI / UX",
  "motion-design": "Motion design",
  "photographie": "Photographie",
  "videographie": "Vidéographie",
  "game-design": "Game design",
  "game-dev": "Game dev",
  "autre": "Autre"
};


// ==========================================================================
// OUTILS
// ==========================================================================

// Crée un élément HTML en une ligne : el('div', 'ma-classe', 'texte')
// (textContent est utilisé partout : un nom ou une bio ne peut jamais injecter de code)
function el(balise, classe, texte) {
  const element = document.createElement(balise);
  if (classe) element.className = classe;
  if (texte) element.textContent = texte;
  return element;
}

// "Fritzner Richard" -> "FR"
function initiales(nom) {
  return nom
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(function (mot) { return mot.charAt(0).toUpperCase(); })
    .join("");
}

// 5 -> "05"
function deuxChiffres(nombre) {
  return String(nombre).padStart(2, "0");
}

// Accepte seulement les liens http(s), pour éviter les liens dangereux
function lienSur(url) {
  return /^https?:\/\//i.test(url || "");
}


// ==========================================================================
// RÉCUPÉRER LES FONDATEURS
// ==========================================================================

async function chargerFondateurs() {

  if (!UTILISER_SUPABASE || typeof supabaseClient === "undefined") {
    return FONDATEURS_SECOURS;
  }

  try {
    const lireFondateurs = (colonnes) => supabaseClient
      .from("profils")
      .select(colonnes)
      .eq("est_fondateur", true)
      .order("rang_fondateur", { ascending: true });

    const colonnes = "nom, discipline, bio, portfolio_url, rang_fondateur, fondateur_depuis";

    // On demande la photo ; si la colonne n'existe pas encore, on réessaie sans elle
    let { data, error } = await lireFondateurs(colonnes + ", photo_url");
    if (error) ({ data, error } = await lireFondateurs(colonnes));

    if (error) throw error;

    return data.map(function (p) {
      return {
        rang: p.rang_fondateur,
        nom: p.nom || "Membre",
        discipline: p.discipline,
        bio: p.bio,
        portfolio: p.portfolio_url,
        photo: p.photo_url,
        depuis: p.fondateur_depuis
      };
    });

  } catch (e) {
    console.error("Impossible de charger les fondateurs :", e);
    return FONDATEURS_SECOURS;
  }
}


// ==========================================================================
// AFFICHAGE
// ==========================================================================

// Carte d'un fondateur
function creerCarteFondateur(f) {

  const carte = el("article", "fondateur-carte");

  carte.appendChild(el("span", "fondateur-rang", "N° " + deuxChiffres(f.rang)));
  // Avatar : la photo si le membre en a une, sinon ses initiales
  const avatar = el("div", "fondateur-avatar couleur-" + (f.rang % 4));
  if (lienSur(f.photo)) {
    const image = el("img");
    image.src = f.photo;
    image.alt = "Photo de " + f.nom;
    image.loading = "lazy";
    avatar.appendChild(image);
  } else {
    avatar.textContent = initiales(f.nom);
  }
  carte.appendChild(avatar);
  carte.appendChild(el("h3", "", f.nom));
  carte.appendChild(el("span", "fondateur-discipline", LABELS_DISCIPLINES[f.discipline] || f.discipline || "Artiste visuel"));

  if (f.bio) carte.appendChild(el("p", "fondateur-bio", f.bio));

  if (f.depuis) {
    const date = new Date(f.depuis).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    carte.appendChild(el("p", "fondateur-date", "Fondateur depuis " + date));
  }

  if (lienSur(f.portfolio)) {
    const lien = el("a", "fondateur-lien", "Voir le portfolio →");
    lien.href = f.portfolio;
    lien.target = "_blank";
    lien.rel = "noopener noreferrer";
    carte.appendChild(lien);
  }

  return carte;
}

// Carte d'une place encore libre
function creerCarteVide(rang) {

  const carte = el("article", "fondateur-carte vide");

  carte.appendChild(el("span", "fondateur-rang", "N° " + deuxChiffres(rang)));
  carte.appendChild(el("div", "fondateur-avatar", "?"));
  carte.appendChild(el("h3", "", "Place disponible"));
  carte.appendChild(el("p", "fondateur-bio", "Propose un guide pour tenter d'obtenir cette place."));

  return carte;
}

function afficherPage(fondateurs) {

  // On garde seulement les numéros valides (1 à NOMBRE_DE_PLACES)
  const parRang = {};
  fondateurs.forEach(function (f) {
    if (f.rang >= 1 && f.rang <= NOMBRE_DE_PLACES) parRang[f.rang] = f;
  });

  // Grille : une carte par place, pleine ou vide
  const grille = document.getElementById("grille-fondateurs");
  grille.innerHTML = "";

  for (let rang = 1; rang <= NOMBRE_DE_PLACES; rang++) {
    grille.appendChild(parRang[rang] ? creerCarteFondateur(parRang[rang]) : creerCarteVide(rang));
  }

  // Compteur
  const prises = Object.keys(parRang).length;
  const restantes = NOMBRE_DE_PLACES - prises;

  document.getElementById("places-prises").textContent = prises;
  document.getElementById("barre-places").style.width = (prises / NOMBRE_DE_PLACES * 100) + "%";
  document.getElementById("places-restantes").textContent =
    restantes === 0
      ? "Toutes les places sont attribuées."
      : restantes === 1
        ? "Il reste 1 place."
        : "Il reste " + restantes + " places.";
}

// Remplace le "25" écrit dans le texte de la page par la valeur du réglage
document.querySelectorAll(".nb-places").forEach(function (element) {
  element.textContent = NOMBRE_DE_PLACES;
});

chargerFondateurs().then(afficherPage);
