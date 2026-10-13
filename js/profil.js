// ==========================================================================
// PAGE PROFIL
//   profil.html            -> ton propre profil (connexion obligatoire), modifiable
//   profil.html?id=<id>    -> le profil d'un autre membre (visible s'il est public)
// Ordre des scripts : supabase-js, supabase-client.js, puis ce fichier.
// ==========================================================================

// ---------- RÉGLAGES ----------

// false = n'affiche ni la liste ni les chiffres des guides
const AFFICHER_GUIDES = true;

// Longueur maximale de la bio (doit rester identique à la limite du SQL)
const LONGUEUR_MAX_BIO = 300;

// Disciplines proposées dans le formulaire (valeur enregistrée -> nom affiché)
const LABELS_DISCIPLINES = {
  "illustration": "Illustration",
  "bd": "Bande dessinée",
  "animation2d": "Animation 2D",
  "graffiti": "Graffiti / art urbain",
  "design": "Design graphique",
  "art3d": "Art 3D",
  "concept-art": "Concept art",
  "autre": "Autre"
};

// Catégories de guides (valeur enregistrée -> nom affiché)
const LABELS_CATEGORIES = {
  "techniques-base": "Techniques de base en dessin",
  "storyboard": "Storyboard",
  "contexte-local": "Trouver ses outils",
  "histoire": "Histoire de l'art",
  "business": "Vendre son art",
  "portraits": "Portrait",
  "bande-dessiner": "Bande dessinée",
  "anatomy": "Anatomie humaine",
  "techniques-couleur": "Colorimétrie",
  "design": "Design",
  "concept-art": "Concept art",
  "photographie": "Photographie",
  "videographie": "Vidéographie",
  "game-design": "Game design",
  "game-dev": "Game dev",
  "fixer-prix": "Fixer un prix",
  "techniques": "Techniques"
};


// ---------- OUTILS ----------

const $ = (id) => document.getElementById(id);

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
    .map((mot) => mot.charAt(0).toUpperCase())
    .join("");
}

// Accepte seulement les liens http(s), pour éviter les liens dangereux
function lienSur(url) {
  return /^https?:\/\//i.test(url || "");
}

// "2026-10-08T..." -> "octobre 2026"
function moisAnnee(date) {
  return new Date(date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// Donne toujours la même couleur d'avatar (0 à 3) à un même identifiant
function numeroCouleur(id) {
  let somme = 0;
  for (const caractere of id) somme += caractere.charCodeAt(0);
  return somme % 4;
}

// Affiche un message dans une zone (type : "succes" ou "erreur")
function afficherMessage(zone, texte, type) {
  zone.textContent = texte;
  zone.className = "message " + type;
  zone.hidden = false;
}

// Active ou désactive l'état "chargement" d'un bouton
function definirChargement(bouton, actif, texte) {
  bouton.disabled = actif;
  bouton.classList.toggle("chargement", actif);
  bouton.textContent = texte;
}


// ---------- ÉTAT DE LA PAGE ----------

let profil = null;      // les données du profil affiché
let estMoi = false;     // true si c'est ton propre profil


function montrerIntrouvable(texte) {
  $("etat-chargement").hidden = true;
  $("profil-contenu").hidden = true;
  if (texte) $("etat-introuvable-texte").textContent = texte;
  $("etat-introuvable").hidden = false;
}


// ---------- DÉMARRAGE ----------

async function demarrer() {

  if (typeof supabaseClient === "undefined") {
    montrerIntrouvable("Le service est momentanément indisponible. Réessaie dans un instant.");
    return;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const idDemande = new URLSearchParams(window.location.search).get("id");

    // Sans ?id= : on affiche ton propre profil, donc il faut être connecté
    let idProfil = idDemande;
    if (!idProfil) {
      if (!session) {
        window.location.replace("login.html?redirection=profil.html");
        return;
      }
      idProfil = session.user.id;
    }

    // Un identifiant valide ressemble à : 3f2b8c1e-.... (lettres, chiffres et tirets)
    if (!/^[0-9a-f-]{36}$/i.test(idProfil)) {
      montrerIntrouvable();
      return;
    }

    estMoi = Boolean(session && session.user.id === idProfil);

    const { data, error } = await supabaseClient
      .from("profils")
      .select("id, nom, discipline, bio, portfolio_url, profil_public, est_fondateur, rang_fondateur, fondateur_depuis, cree_le")
      .eq("id", idProfil)
      .maybeSingle();

    // Pas de ligne = le profil n'existe pas, ou il est privé (la base ne le montre pas)
    if (error || !data) {
      if (error) console.error("Lecture du profil impossible :", error);
      montrerIntrouvable();
      return;
    }

    profil = data;
    afficherProfil();

    $("etat-chargement").hidden = true;
    $("profil-contenu").hidden = false;

    chargerGuides();

  } catch (e) {
    console.error(e);
    montrerIntrouvable("Une erreur est survenue. Réessaie dans un instant.");
  }
}


// ---------- AFFICHAGE DU PROFIL ----------

function afficherProfil() {

  const nom = profil.nom || "Membre";

  document.title = nom + " — Atizay Knowledge";

  // Avatar
  const avatar = $("profil-avatar");
  avatar.textContent = initiales(nom);
  avatar.className = "profil-avatar couleur-" + numeroCouleur(profil.id);

  $("profil-nom").textContent = nom;
  $("profil-discipline").textContent = LABELS_DISCIPLINES[profil.discipline] || profil.discipline || "Artiste visuel";

  // Badge fondateur
  const badge = $("profil-fondateur");
  if (profil.est_fondateur && profil.rang_fondateur) {
    badge.textContent = "Contributeur fondateur N° " + String(profil.rang_fondateur).padStart(2, "0");
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }

  // Un fondateur est toujours visible par tous
  const estVisible = Boolean(profil.profil_public || profil.est_fondateur);

  // Pastille "public / privé" et note : seulement sur ton propre profil
  const pastille = $("profil-visibilite");
  if (estMoi) {
    pastille.textContent = estVisible ? "Profil public" : "Profil privé";
    pastille.classList.toggle("publique", estVisible);
    pastille.hidden = false;
  } else {
    pastille.hidden = true;
  }
  $("note-prive").hidden = !(estMoi && !estVisible);

  // Bio
  const bio = $("profil-bio");
  if (profil.bio) {
    bio.textContent = profil.bio;
    bio.classList.remove("vide");
    bio.hidden = false;
  } else if (estMoi) {
    bio.textContent = "Ajoute une bio pour te présenter aux autres artistes.";
    bio.classList.add("vide");
    bio.hidden = false;
  } else {
    bio.hidden = true;
  }

  // Date d'inscription
  $("profil-meta").textContent = profil.cree_le ? "Membre depuis " + moisAnnee(profil.cree_le) : "";

  // Portfolio
  const lienPortfolio = $("profil-portfolio");
  if (lienSur(profil.portfolio_url)) {
    lienPortfolio.href = profil.portfolio_url;
    lienPortfolio.hidden = false;
  } else {
    lienPortfolio.hidden = true;
  }

  // Bouton de modification : seulement pour son propre profil
  $("btn-modifier").hidden = !estMoi;
}


// ---------- GUIDES PUBLIÉS ----------

async function chargerGuides() {

  if (!AFFICHER_GUIDES) {
    $("bloc-guides").hidden = true;
    document.querySelector(".stats-profil").hidden = true;
    return;
  }

  let guides = [];

  try {
    const { data, error } = await supabaseClient
      .from("guides")
      .select("id, titre, categorie, vues")
      .eq("auteur_id", profil.id)
      .eq("publie", true)
      .order("cree_le", { ascending: false });

    if (error) throw error;
    guides = data || [];

  } catch (e) {
    // Table "guides" absente ou colonnes différentes : on affiche simplement "aucun guide"
    console.error("Lecture des guides impossible :", e);
  }

  afficherGuides(guides);
}

function afficherGuides(guides) {

  // Chiffres
  const vuesTotales = guides.reduce((somme, g) => somme + (g.vues || 0), 0);
  $("stat-guides").textContent = guides.length;
  $("stat-vues").textContent = vuesTotales.toLocaleString("fr-FR");

  const liste = $("liste-guides");
  const vide = $("guides-vide");
  liste.innerHTML = "";

  if (guides.length === 0) {
    vide.innerHTML = "";
    if (estMoi) {
      vide.appendChild(document.createTextNode("Tu n'as pas encore de guide publié. "));
      const lien = el("a", "", "Propose ton premier guide");
      lien.href = "proposer-guide.html";
      vide.appendChild(lien);
      vide.appendChild(document.createTextNode("."));
    } else {
      vide.textContent = "Aucun guide publié pour l'instant.";
    }
    vide.hidden = false;
    return;
  }

  vide.hidden = true;

  guides.forEach(function (g) {
    const carte = el("a", "guide-carte");
    carte.href = "guide-detail.html?id=" + encodeURIComponent(g.id);
    carte.appendChild(el("span", "guide-carte-cat", LABELS_CATEGORIES[g.categorie] || g.categorie || "Guide"));
    carte.appendChild(el("h3", "", g.titre));
    carte.appendChild(el("span", "guide-carte-vues", (g.vues || 0).toLocaleString("fr-FR") + " vues"));
    liste.appendChild(carte);
  });
}


// ---------- MODIFICATION DU PROFIL ----------

function majCompteurBio() {
  $("compteur-bio").textContent = $("champ-bio").value.length + " / " + LONGUEUR_MAX_BIO;
}

// Remplit la liste des disciplines du formulaire
function remplirDisciplines(valeurActuelle) {
  const select = $("champ-discipline");
  select.innerHTML = "";

  Object.keys(LABELS_DISCIPLINES).forEach(function (valeur) {
    const option = el("option", "", LABELS_DISCIPLINES[valeur]);
    option.value = valeur;
    select.appendChild(option);
  });

  // Ancienne valeur qui n'est plus dans la liste : on la garde pour ne rien perdre
  if (valeurActuelle && !LABELS_DISCIPLINES[valeurActuelle]) {
    const option = el("option", "", valeurActuelle);
    option.value = valeurActuelle;
    select.appendChild(option);
  }

  select.value = valeurActuelle || "autre";
}

function ouvrirEdition() {
  $("champ-nom").value = profil.nom || "";
  remplirDisciplines(profil.discipline);
  $("champ-bio").value = profil.bio || "";
  $("champ-portfolio").value = profil.portfolio_url || "";
  $("champ-public").checked = Boolean(profil.profil_public);
  majCompteurBio();

  $("message-profil").hidden = true;
  $("message-global").hidden = true;
  $("profil-edition").hidden = false;
  $("profil-edition").scrollIntoView({ behavior: "smooth", block: "start" });
  $("champ-nom").focus();
}

function fermerEdition() {
  $("profil-edition").hidden = true;
}

// Vérifie les champs ; retourne un message d'erreur, ou "" si tout va bien
function verifierFormulaire(nom, bio, portfolio) {
  if (nom.length < 2) return "Ton nom doit contenir au moins 2 caractères.";
  if (nom.length > 60) return "Ton nom est trop long (60 caractères maximum).";
  if (bio.length > LONGUEUR_MAX_BIO) return "Ta bio est trop longue (" + LONGUEUR_MAX_BIO + " caractères maximum).";
  if (portfolio && !lienSur(portfolio)) return "Le lien du portfolio doit commencer par http:// ou https://";
  return "";
}

async function enregistrerProfil(e) {
  e.preventDefault();

  const zoneMessage = $("message-profil");
  const bouton = $("btn-enregistrer");

  const nom = $("champ-nom").value.trim();
  const discipline = $("champ-discipline").value;
  const bio = $("champ-bio").value.trim();
  const portfolio = $("champ-portfolio").value.trim();
  const estPublic = $("champ-public").checked;

  zoneMessage.hidden = true;

  const erreur = verifierFormulaire(nom, bio, portfolio);
  if (erreur) {
    afficherMessage(zoneMessage, erreur, "erreur");
    return;
  }

  definirChargement(bouton, true, "Enregistrement...");

  try {
    const { data, error } = await supabaseClient
      .from("profils")
      .update({
        nom: nom,
        discipline: discipline,
        bio: bio || null,
        portfolio_url: portfolio || null,
        profil_public: estPublic
      })
      .eq("id", profil.id)
      .select()
      .single();

    if (error) throw error;

    profil = Object.assign({}, profil, data);

  } catch (err) {
    console.error(err);
    definirChargement(bouton, false, "Enregistrer");
    afficherMessage(zoneMessage, "Enregistrement impossible : " + (err.message || "erreur inconnue"), "erreur");
    return;
  }

  definirChargement(bouton, false, "Enregistrer");
  fermerEdition();
  afficherProfil();

  const zoneGlobale = $("message-global");
  afficherMessage(zoneGlobale, "Profil mis à jour.", "succes");
  setTimeout(function () { zoneGlobale.hidden = true; }, 4000);
}


// ---------- ÉVÉNEMENTS ----------

$("btn-modifier").addEventListener("click", ouvrirEdition);
$("btn-annuler").addEventListener("click", fermerEdition);
$("form-profil").addEventListener("submit", enregistrerProfil);
$("champ-bio").addEventListener("input", majCompteurBio);

demarrer();
