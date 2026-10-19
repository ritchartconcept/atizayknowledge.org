// ==========================================================================
// SUIVI DE PROGRESSION
// Coche les modules terminés, mémorise où le membre s'est arrêté et propose
// "Reprendre". Chargé APRÈS guide-detail.js (voir guide-detail.html).
// Ne fait rien pour un visiteur non connecté, ni en mode aperçu.
// ==========================================================================
(function () {

  const suivi = { actif: false, userId: null, termines: [], dernier: 0, fini: false };
  let initialise = false;

  // On enveloppe afficherModule (défini dans guide-detail.js) pour réagir à chaque changement de module
  const afficherModuleOriginal = afficherModule;

  afficherModule = function (index) {
    const precedent = moduleActif;
    afficherModuleOriginal(index);

    // Premier affichage : on charge la progression du membre (une seule fois)
    if (!initialise && guide && guide.id && !modeApercu) {
      initialise = true;
      chargerProgression();
    }

    if (suivi.actif) {
      // Passer au module suivant = le module précédent est terminé
      if (index === precedent + 1) marquerTermine(precedent);
      enregistrer();
    }
    majInterface();
  };

  function marquerTermine(i) {
    if (!suivi.termines.includes(i)) suivi.termines.push(i);
  }

  async function chargerProgression() {
    if (typeof supabaseClient === "undefined") return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return;

    suivi.userId = session.user.id;
    suivi.actif = true;

    const { data } = await supabaseClient
      .from("progression")
      .select("modules_termines, dernier_module, termine")
      .eq("guide_id", guide.id)
      .maybeSingle();

    if (data) {
      suivi.termines = data.modules_termines || [];
      suivi.dernier = data.dernier_module || 0;
      suivi.fini = Boolean(data.termine);
    }

    proposerReprise();
    majInterface();
  }

  // Enregistre la progression (une ligne par membre et par guide)
  async function enregistrer() {
    const { error } = await supabaseClient.from("progression").upsert({
      user_id: suivi.userId,
      guide_id: guide.id,
      modules_termines: suivi.termines,
      dernier_module: moduleActif,
      termine: suivi.fini,
      maj_le: new Date().toISOString()
    }, { onConflict: "user_id,guide_id" });

    if (error) console.error("Progression non enregistrée :", error);
  }

  // Bandeau "Tu t'étais arrêté au module N" avec un bouton Reprendre
  function proposerReprise() {
    if (suivi.fini || suivi.dernier <= 0 || suivi.dernier >= guide.modules.length) return;
    if (moduleActif !== 0) return;

    const bandeau = document.createElement("div");
    bandeau.className = "reprise";

    const texte = document.createElement("span");
    texte.textContent = "Tu t'étais arrêté au module " + (suivi.dernier + 1) + ".";

    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "btn btn-primary";
    bouton.textContent = "Reprendre";
    bouton.addEventListener("click", function () {
      bandeau.remove();
      afficherModule(suivi.dernier);
    });

    bandeau.appendChild(texte);
    bandeau.appendChild(bouton);
    document.getElementById("guide-contenu")
      .insertBefore(bandeau, document.querySelector(".guide-layout"));
  }

  // Coches du sommaire, barre d'avancement, bouton "Terminer le guide"
  function majInterface() {
    if (!guide || !guide.modules) return;
    const total = guide.modules.length;

    document.querySelectorAll(".sommaire-liste button").forEach(function (b, i) {
      b.classList.toggle("fait", suivi.termines.includes(i));
    });

    if (!suivi.actif) return;

    document.getElementById("progression-barre").style.width =
      (suivi.termines.length / total * 100) + "%";

    const bouton = document.getElementById("btn-suivant");
    if (moduleActif === total - 1) {
      bouton.disabled = suivi.fini;
      bouton.textContent = suivi.fini ? "Guide terminé" : "Terminer le guide";
    } else {
      bouton.textContent = "Module suivant →";
    }
  }

  // Clic sur "Terminer le guide" (dernier module)
  document.getElementById("btn-suivant").addEventListener("click", function () {
    if (!suivi.actif || !guide || suivi.fini) return;
    if (moduleActif !== guide.modules.length - 1) return;

    marquerTermine(moduleActif);
    suivi.fini = true;
    enregistrer();
    majInterface();

    const fin = document.createElement("p");
    fin.className = "fin-guide";
    fin.append("Bravo, tu as terminé ce guide. ");
    const lien = document.createElement("a");
    lien.href = "guides.html";
    lien.textContent = "Voir d'autres guides";
    fin.appendChild(lien);
    document.querySelector(".guide-module").appendChild(fin);
  });

})();
