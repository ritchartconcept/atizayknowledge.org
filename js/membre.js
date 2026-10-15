(async function () {
  const { data: { session } } = await supabaseClient.auth.getSession();

  // Si personne n'est connecté, on renvoie directement vers la connexion.
  if (!session) {
    window.location.href = "login.html";
    return;
  }

  // On récupère le profil (nom, discipline) lié à ce compte,
  // pour afficher "Bienvenue, [nom]" dynamiquement sur la page.
  const { data: profil } = await supabaseClient
    .from('profils')
    .select('nom, discipline')
    .eq('id', session.user.id)
    .single();

  if (profil) {
    document.querySelector('.bienvenue h1').textContent = "Bienvenue, " + profil.nom;
  }

  // NOUVEAU : remplit les statistiques et le tableau "Mes guides"
  chargerStatistiques(session.user.id);
})();


// NOUVEAU : calcule les statistiques à partir de Supabase
async function chargerStatistiques(userId) {
  const mettre = (id, valeur) => {
    const e = document.getElementById(id);
    if (e) e.textContent = valeur;
  };

  // Tes guides publiés
  let publies = [];
  const r1 = await supabaseClient.from("guides")
    .select("id, titre, categorie, vues")
    .eq("auteur_id", userId).eq("publie", true);
  if (!r1.error) publies = r1.data;

  // Tes propositions en attente (la base ne renvoie que les tiennes)
  let attente = [];
  const r2 = await supabaseClient.from("propositions")
    .select("id, titre, categorie, statut")
    .eq("auteur_id", userId).eq("statut", "en_attente");
  if (!r2.error) attente = r2.data;

  mettre("stat-publies", publies.length);
  mettre("stat-attente", attente.length);
  mettre("stat-vues", publies.reduce((s, g) => s + (g.vues || 0), 0).toLocaleString("fr-FR"));
  // Les revenus restent à 0 $ tant que la vente de contenu premium n'existe pas.

  // Tableau "Mes guides"
  const liste = document.getElementById("liste-mes-guides");
  if (!liste) return;
  liste.innerHTML = "";

  const ligne = (titre, categorie, classe, texte, vues) => {
    const l = document.createElement("div");
    l.className = "ligne-guide";
    const t = document.createElement("span");
    t.className = "titre-guide"; t.textContent = titre;
    const c = document.createElement("span"); c.textContent = categorie || "";
    const s = document.createElement("span");
    const p = document.createElement("span");
    p.className = "statut-pill " + classe; p.textContent = texte;
    s.appendChild(p);
    const v = document.createElement("span"); v.textContent = vues;
    [t, c, s, v].forEach((x) => l.appendChild(x));
    liste.appendChild(l);
  };

  publies.forEach((g) => ligne(g.titre, g.categorie, "statut-publie", "Publié", g.vues || 0));
  attente.forEach((p) => ligne(p.titre, p.categorie, "statut-attente", "En attente", "—"));

  if (publies.length + attente.length === 0) {
    const vide = document.createElement("p");
    vide.style.padding = "22px";
    vide.append("Aucun guide pour l'instant. ");
    const lien = document.createElement("a");
    lien.href = "proposer-guide.html";
    lien.textContent = "Propose ton premier guide";
    vide.appendChild(lien);
    liste.appendChild(vide);
  }
}


// Bouton de déconnexion — attache-le à ton lien "Déconnexion" existant
// en lui ajoutant l'id="deconnexion" dans le HTML.
document.getElementById('deconnexion')?.addEventListener('click', async function (e) {
  e.preventDefault();
  await supabaseClient.auth.signOut();
  window.location.href = "login.html";
});
