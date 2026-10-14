// ==========================================================================
// PAGE PROFIL
//   profil.html            -> ton propre profil (connexion obligatoire), modifiable
//   profil.html?id=<id>    -> le profil d'un autre membre (visible s'il est public)
// Ordre des scripts : supabase-js, supabase-client.js, puis ce fichier.
// ==========================================================================

// ---------- RÉGLAGES ----------

// false = n'affiche ni la liste ni les chiffres des guides
const AFFICHER_GUIDES = true;

// Photo de profil : nom de l'espace de stockage Supabase et taille finale (carré, en pixels)
const BUCKET_AVATARS = "avatars";
const TAILLE_AVATAR = 400;

// Longueur maximale de la bio (doit rester identique à la limite du SQL)
const LONGUEUR_MAX_BIO = 300;

// Disciplines proposées dans le formulaire (valeur enregistrée -> nom affiché)
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
      .select("id, nom, discipline, bio, portfolio_url, photo_url, profil_public, est_fondateur, rang_fondateur, fondateur_depuis, cree_le")
      .eq("id", idProfil)
      .maybeSingle();

    // Erreur de lecture (ex : colonne manquante, règle de sécurité absente)
    if (error) {
      console.error("Lecture du profil impossible :", error);
      montrerIntrouvable(estMoi
        ? "Impossible de charger ton profil. Ouvre la console (touche F12) pour voir le détail de l'erreur."
        : undefined);
      return;
    }

    // Pas de ligne = le profil n'existe pas, ou il est privé (la base ne le montre pas)
    if (!data) {
      montrerIntrouvable(estMoi
        ? "Ton compte n'a pas encore de profil dans la base de données."
        : undefined);
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
  avatar.className = "profil-avatar couleur-" + numeroCouleur(profil.id);
  avatar.textContent = "";
  if (lienSur(profil.photo_url)) {
    const image = el("img", "avatar-img");
    image.src = profil.photo_url;
    image.alt = "Photo de " + nom;
    avatar.appendChild(image);
  } else {
    avatar.textContent = initiales(nom);
  }

  // Boutons de photo : seulement sur ton propre profil
  $("avatar-bouton").hidden = !estMoi;
  $("btn-retirer-photo").hidden = !(estMoi && lienSur(profil.photo_url));

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


// ---------- PHOTO DE PROFIL ----------

// Découpe l'image en carré centré et la réduit à TAILLE_AVATAR pixels
// (une photo légère se charge vite, même avec une connexion lente)
function redimensionnerAvatar(fichier) {
  return new Promise(function (resolve, reject) {
    const lecteur = new FileReader();
    lecteur.onerror = reject;
    lecteur.onload = function (e) {
      const img = new Image();
      img.onerror = reject;
      img.onload = function () {
        const cote = Math.min(img.width, img.height);
        const canvas = document.createElement("canvas");
        canvas.width = TAILLE_AVATAR;
        canvas.height = TAILLE_AVATAR;
        canvas.getContext("2d").drawImage(
          img, (img.width - cote) / 2, (img.height - cote) / 2, cote, cote,
          0, 0, TAILLE_AVATAR, TAILLE_AVATAR
        );
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error("Conversion de l'image impossible"));
        }, "image/jpeg", 0.85);
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

function messageTemporaire(texte, type) {
  const zone = $("message-global");
  afficherMessage(zone, texte, type);
  setTimeout(function () { zone.hidden = true; }, 4000);
}

async function changerPhoto(fichier) {
  if (!fichier) return;

  if (!/^image\/(jpeg|png|webp)$/.test(fichier.type)) {
    messageTemporaire("Choisis une image JPG, PNG ou WebP.", "erreur");
    return;
  }
  if (fichier.size > 8 * 1024 * 1024) {
    messageTemporaire("Cette image est trop lourde (8 Mo maximum).", "erreur");
    return;
  }

  const bouton = $("avatar-bouton");
  bouton.classList.add("charge");

  try {
    const blob = await redimensionnerAvatar(fichier);

    // Chaque membre a son propre dossier : avatars/<son identifiant>/avatar.jpg
    const chemin = profil.id + "/avatar.jpg";
    const { error: erreurEnvoi } = await supabaseClient.storage
      .from(BUCKET_AVATARS)
      .upload(chemin, blob, { upsert: true, contentType: "image/jpeg" });
    if (erreurEnvoi) throw erreurEnvoi;

    // "?v=..." force le navigateur à recharger la nouvelle photo
    const { data: lien } = supabaseClient.storage.from(BUCKET_AVATARS).getPublicUrl(chemin);
    const url = lien.publicUrl + "?v=" + Date.now();

    const { data, error } = await supabaseClient
      .from("profils")
      .update({ photo_url: url })
      .eq("id", profil.id)
      .select()
      .single();
    if (error) throw error;

    profil = Object.assign({}, profil, data);
    afficherProfil();
    messageTemporaire("Photo mise à jour.", "succes");

  } catch (e) {
    console.error(e);
    messageTemporaire("Envoi de la photo impossible : " + (e.message || "erreur inconnue"), "erreur");
  } finally {
    bouton.classList.remove("charge");
    $("avatar-fichier").value = "";
  }
}

async function retirerPhoto() {
  if (!confirm("Retirer ta photo de profil ?")) return;

  try {
    await supabaseClient.storage.from(BUCKET_AVATARS).remove([profil.id + "/avatar.jpg"]);

    const { data, error } = await supabaseClient
      .from("profils")
      .update({ photo_url: null })
      .eq("id", profil.id)
      .select()
      .single();
    if (error) throw error;

    profil = Object.assign({}, profil, data);
    afficherProfil();
    messageTemporaire("Photo retirée.", "succes");

  } catch (e) {
    console.error(e);
    messageTemporaire("Impossible de retirer la photo : " + (e.message || "erreur inconnue"), "erreur");
  }
}


// ---------- ÉVÉNEMENTS ----------

$("btn-modifier").addEventListener("click", ouvrirEdition);
$("btn-annuler").addEventListener("click", fermerEdition);
$("form-profil").addEventListener("submit", enregistrerProfil);
$("champ-bio").addEventListener("input", majCompteurBio);
$("avatar-fichier").addEventListener("change", function () { changerPhoto(this.files[0]); });
$("btn-retirer-photo").addEventListener("click", retirerPhoto);

demarrer();
