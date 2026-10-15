// Page d'administration : relire, publier ou refuser les propositions de guides.
// Réservée aux comptes dont profils.est_admin vaut true.
// (La vraie protection est dans Supabase : sans ce rôle, la base refuse tout.)

const $ = (id) => document.getElementById(id);

const LIBELLES = { en_attente: "En attente", publiee: "Publiée", refusee: "Refusée" };
const ONGLETS = [["en_attente", "En attente"], ["publiee", "Publiées"], ["refusee", "Refusées"]];

let propositions = [];
let ongletActif = "en_attente";

function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte) e.textContent = texte;
  return e;
}

function bouton(texte, classe, action) {
  const b = el("button", classe, texte);
  b.type = "button";
  b.addEventListener("click", function () { action(b); });
  return b;
}

function afficherMessage(texte, type) {
  const zone = $("message-admin");
  zone.textContent = texte;
  zone.className = "message " + type;
  zone.hidden = false;
  if (type === "succes") setTimeout(function () { zone.hidden = true; }, 4000);
}

function bloquer(texte) {
  $("etat").textContent = texte;
  $("etat").hidden = false;
  $("admin-contenu").hidden = true;
}


// ---------- Démarrage : connexion + rôle administrateur ----------
async function demarrer() {
  if (typeof supabaseClient === "undefined") return bloquer("Service indisponible.");

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.replace("login.html");
    return;
  }

  const { data: profil } = await supabaseClient
    .from("profils").select("est_admin").eq("id", session.user.id).maybeSingle();

  if (!profil || !profil.est_admin) return bloquer("Accès réservé à l'administrateur.");

  $("etat").hidden = true;
  $("admin-contenu").hidden = false;
  charger();
}


// ---------- Lecture des propositions ----------
async function charger() {
  // "contenu" (le guide complet) n'est pas chargé ici : il est lourd, on le lit à la demande
  const { data, error } = await supabaseClient
    .from("propositions")
    .select("id, titre, categorie, resume, auteur_nom, statut, cree_le")
    .order("cree_le", { ascending: false });

  if (error) {
    console.error(error);
    return afficherMessage("Lecture impossible : " + error.message, "erreur");
  }
  propositions = data;
  afficher();
}

function afficher() {
  // Onglets avec compteurs
  const zoneOnglets = $("onglets");
  zoneOnglets.innerHTML = "";
  ONGLETS.forEach(function (o) {
    const n = propositions.filter(function (p) { return p.statut === o[0]; }).length;
    const b = bouton(o[1] + " (" + n + ")", "onglet" + (o[0] === ongletActif ? " actif" : ""), function () {
      ongletActif = o[0];
      afficher();
    });
    zoneOnglets.appendChild(b);
  });

  // Cartes
  const liste = $("liste-propositions");
  liste.innerHTML = "";
  const visibles = propositions.filter(function (p) { return p.statut === ongletActif; });

  if (visibles.length === 0) {
    liste.appendChild(el("p", "vide-admin", "Aucune proposition dans cet onglet."));
    return;
  }
  visibles.forEach(function (p) { liste.appendChild(creerCarte(p)); });
}

function creerCarte(p) {
  const carte = el("article", "proposition");

  const haut = el("div", "proposition-haut");
  haut.appendChild(el("h3", "", p.titre));
  haut.appendChild(el("span", "pastille-statut statut-" + p.statut, LIBELLES[p.statut] || p.statut));
  carte.appendChild(haut);

  const date = new Date(p.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  carte.appendChild(el("p", "proposition-meta",
    (labelsCategories[p.categorie] || p.categorie) + " · " + (p.auteur_nom || "Membre") + " · " + date));
  if (p.resume) carte.appendChild(el("p", "proposition-resume", p.resume));

  const actions = el("div", "proposition-actions");
  actions.appendChild(bouton("Lire comme un lecteur", "btn btn-secondaire", function () { lire(p); }));

  if (p.statut === "en_attente") {
    actions.appendChild(bouton("Publier", "btn btn-principal", function (b) { publier(p, b); }));
    actions.appendChild(bouton("Refuser", "btn btn-danger", function () { changerStatut(p, "refusee", "Refuser cette proposition ?"); }));
  }
  if (p.statut === "refusee") {
    actions.appendChild(bouton("Remettre en attente", "btn btn-secondaire", function () { changerStatut(p, "en_attente"); }));
  }
  carte.appendChild(actions);
  return carte;
}


// ---------- Actions ----------

// Ouvre la proposition dans la vraie page de lecture (comme un lecteur la verra)
async function lire(p) {
  const fenetre = window.open("about:blank", "_blank");   // ouverte tout de suite : évite le blocage du navigateur

  const { data, error } = await supabaseClient
    .from("propositions").select("contenu").eq("id", p.id).single();

  if (error) {
    if (fenetre) fenetre.close();
    return afficherMessage("Lecture impossible : " + error.message, "erreur");
  }

  const guide = {
    id: 0, titre: p.titre, categorie: p.categorie, resume: p.resume,
    auteur: p.auteur_nom || "Membre", vues: 0, modules: data.contenu
  };
  try {
    localStorage.setItem("apercuGuide", JSON.stringify(guide));
  } catch (e) {
    if (fenetre) fenetre.close();
    return afficherMessage("Cette proposition est trop lourde pour l'aperçu (images).", "erreur");
  }
  if (fenetre) fenetre.location.href = "guide-detail.html?brouillon=1";
}

// Publie : copie la proposition dans "guides" (fonction SQL publier_proposition)
async function publier(p, b) {
  if (!confirm("Publier « " + p.titre + " » ? Il sera visible par tout le monde.")) return;

  b.disabled = true;
  b.textContent = "Publication...";

  const { error } = await supabaseClient.rpc("publier_proposition", { p_id: p.id });

  if (error) {
    b.disabled = false;
    b.textContent = "Publier";
    return afficherMessage("Publication impossible : " + error.message, "erreur");
  }
  afficherMessage("Guide publié.", "succes");
  charger();
}

async function changerStatut(p, statut, question) {
  if (question && !confirm(question)) return;

  const { error } = await supabaseClient.from("propositions").update({ statut: statut }).eq("id", p.id);
  if (error) return afficherMessage("Modification impossible : " + error.message, "erreur");

  afficherMessage("Proposition mise à jour.", "succes");
  charger();
}

demarrer();
