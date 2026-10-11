document.addEventListener("DOMContentLoaded", () => {

  /* =========================
     RÉGLAGES
  ========================= */

  // false = la proposition reste dans ce navigateur (test)
  // true  = elle est envoyée dans la table "propositions" de Supabase
  const UTILISER_SUPABASE = false;

  // Les types de blocs et le nom affiché sur chaque bloc
  const LIBELLES_BLOCS = {
    titre: "Titre",
    soustitre: "Sous-titre",
    texte: "Texte",
    image: "Image",
    video: "Vidéo"
  };

  const modulesContainer = document.getElementById("modules");
  const btnAjouterModule = document.getElementById("btn-ajouter-module");
  const btnApercu = document.getElementById("btn-apercu");
  const btnSoumettre = document.getElementById("btn-soumettre");
  const message = document.getElementById("message");

  let compteurModules = 0;
  let nomAuteur = "Membre";


  /* =========================
     MESSAGE
  ========================= */

  function afficherMessage(texte, type = "info") {
    message.textContent = texte;
    message.className = `message ${type}`;
    message.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function effacerMessage() {
    message.textContent = "";
    message.className = "message";
  }


  /* =========================
     OUTILS
  ========================= */

  // Réduit une image choisie (largeur max 1000px) avant de la garder
  function reduireImage(fichier, callback) {
    const lecteur = new FileReader();
    lecteur.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const largeurMax = 1000;
        const ratio = Math.min(1, largeurMax / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        callback(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = e.target.result;
    };
    lecteur.readAsDataURL(fichier);
  }

  // Vérifie qu'un lien est bien YouTube ou Vimeo (retourne null sinon)
  function convertirEnUrlEmbed(url) {
    try {
      const u = new URL(url);
      const hote = u.hostname.replace("www.", "");

      if (hote === "youtube.com" || hote === "m.youtube.com") {
        const id = u.searchParams.get("v");
        if (id) return "https://www.youtube.com/embed/" + id;
        if (u.pathname.startsWith("/embed/")) return url;
      }
      if (hote === "youtu.be") return "https://www.youtube.com/embed/" + u.pathname.slice(1);
      if (hote === "vimeo.com") {
        const id = u.pathname.split("/").filter(Boolean)[0];
        if (id) return "https://player.vimeo.com/video/" + id;
      }
      if (hote === "player.vimeo.com") return url;
    } catch (e) {}
    return null;
  }

  // Active ou désactive l'état "chargement" d'un bouton
  function definirChargement(bouton, actif, texte) {
    bouton.disabled = actif;
    bouton.classList.toggle("chargement", actif);
    bouton.textContent = texte;
  }


  /* =========================
     AJOUTER UN MODULE
  ========================= */

  function ajouterModule() {

    compteurModules++;

    const module = document.createElement("article");
    module.className = "module";

    module.innerHTML = `
      <div class="module-entete">

        <span class="module-numero">Module ${compteurModules}</span>

        <div class="module-actions">
          <button type="button" class="btn-monter-module" title="Monter le module" aria-label="Monter le module">↑</button>
          <button type="button" class="btn-descendre-module" title="Descendre le module" aria-label="Descendre le module">↓</button>
          <button type="button" class="btn-supprimer-module" title="Supprimer le module" aria-label="Supprimer le module">×</button>
        </div>

      </div>

      <div class="module-corps">

        <div class="champ">
          <label>Titre du module</label>
          <input type="text" class="module-titre" placeholder="Ex : Comprendre les bases du dessin">
        </div>

        <div class="champ">
          <label>Description du module</label>
          <textarea class="module-description" rows="3"
            placeholder="Présente brièvement ce que l'apprenant va apprendre dans ce module."></textarea>
        </div>

        <div class="blocs"></div>

        <!-- Un bouton par type de bloc. "data-type" dit quel bloc créer. -->
        <div class="bloc-ajout">
          <button type="button" class="btn-bloc" data-type="titre">+ Titre</button>
          <button type="button" class="btn-bloc" data-type="soustitre">+ Sous-titre</button>
          <button type="button" class="btn-bloc" data-type="texte">+ Texte</button>
          <button type="button" class="btn-bloc" data-type="image">+ Image</button>
          <button type="button" class="btn-bloc" data-type="video">+ Vidéo</button>
        </div>

      </div>
    `;

    modulesContainer.appendChild(module);

    ajouterEvenementsModule(module);
    renumeroterModules();
    effacerMessage();
  }


  /* =========================
     ÉVÉNEMENTS MODULE
  ========================= */

  function ajouterEvenementsModule(module) {

    const btnSupprimer = module.querySelector(".btn-supprimer-module");
    const btnMonter = module.querySelector(".btn-monter-module");
    const btnDescendre = module.querySelector(".btn-descendre-module");

    /* Supprimer */
    btnSupprimer.addEventListener("click", () => {
      if (!confirm("Supprimer ce module et tout son contenu ?")) return;
      module.remove();
      renumeroterModules();
    });

    /* Monter */
    btnMonter.addEventListener("click", () => {
      const precedent = module.previousElementSibling;
      if (precedent) {
        modulesContainer.insertBefore(module, precedent);
        renumeroterModules();
      }
    });

    /* Descendre */
    btnDescendre.addEventListener("click", () => {
      const suivant = module.nextElementSibling;
      if (suivant) {
        modulesContainer.insertBefore(suivant, module);
        renumeroterModules();
      }
    });

    /* Ajouter un bloc : un seul code pour les 5 boutons */
    module.querySelectorAll(".btn-bloc").forEach((bouton) => {
      bouton.addEventListener("click", () => {
        ajouterBloc(module, bouton.dataset.type);
      });
    });
  }


  /* =========================
     CONTENU PROPRE À CHAQUE TYPE DE BLOC
     (c'est ici que tu modifies les champs d'un bloc)
  ========================= */

  function corpsDuBloc(type) {

    if (type === "titre") {
      return `<input type="text" class="bloc-contenu bloc-titre-champ" placeholder="Écris ton titre...">`;
    }

    if (type === "soustitre") {
      return `<input type="text" class="bloc-contenu bloc-soustitre-champ" placeholder="Écris ton sous-titre...">`;
    }

    if (type === "texte") {
      return `<textarea class="bloc-contenu" rows="6" placeholder="Écris le contenu de ton cours ici..."></textarea>`;
    }

    if (type === "image") {
      return `
        <div class="image-ligne">
          <label class="btn btn-secondaire">
            Choisir une image
            <input type="file" class="bloc-image-fichier" accept="image/*" hidden>
          </label>
          <input type="url" class="bloc-image-url" placeholder="ou colle un lien : https://exemple.com/image.jpg">
        </div>

        <div class="champ">
          <label>Légende de l'image (facultatif)</label>
          <input type="text" class="bloc-image-legende" placeholder="Ex : Les trois formes de base">
        </div>

        <img class="image-preview" alt="">
      `;
    }

    if (type === "video") {
      return `
        <div class="champ">
          <label>Lien de la vidéo (YouTube ou Vimeo)</label>
          <input type="url" class="bloc-video-url" placeholder="https://www.youtube.com/watch?v=...">
        </div>
      `;
    }

    return "";
  }


  /* =========================
     AJOUTER UN BLOC (tous types)
  ========================= */

  function ajouterBloc(module, type) {

    const blocs = module.querySelector(".blocs");

    const bloc = document.createElement("div");
    bloc.className = "bloc";
    bloc.dataset.type = type;   // sert à retrouver le type quand on lit le guide

    bloc.innerHTML = `
      <div class="bloc-entete">

        <span class="bloc-type">${LIBELLES_BLOCS[type]}</span>

        <div class="bloc-actions">
          <button type="button" class="bloc-monter" title="Monter">↑</button>
          <button type="button" class="bloc-descendre" title="Descendre">↓</button>
          <button type="button" class="bloc-supprimer" title="Supprimer">×</button>
        </div>

      </div>
    ` + corpsDuBloc(type);

    blocs.appendChild(bloc);

    ajouterEvenementsBloc(bloc);

    if (type === "image") activerBlocImage(bloc);
  }


  /* =========================
     BLOC IMAGE : fichier ou lien + aperçu
  ========================= */

  function activerBlocImage(bloc) {

    const champFichier = bloc.querySelector(".bloc-image-fichier");
    const champUrl = bloc.querySelector(".bloc-image-url");
    const apercu = bloc.querySelector(".image-preview");

    // Garde la source de l'image dans le bloc et met l'aperçu à jour
    function definirImage(src) {
      bloc.dataset.src = src || "";
      if (src) {
        apercu.src = src;
        apercu.style.display = "block";
      } else {
        apercu.removeAttribute("src");
        apercu.style.display = "none";
      }
    }

    champFichier.addEventListener("change", () => {
      const fichier = champFichier.files[0];
      if (!fichier) return;
      reduireImage(fichier, (src) => {
        champUrl.value = "";
        definirImage(src);
      });
    });

    champUrl.addEventListener("input", () => {
      definirImage(champUrl.value.trim());
    });
  }


  /* =========================
     ÉVÉNEMENTS DES BLOCS
  ========================= */

  function ajouterEvenementsBloc(bloc) {

    bloc.querySelector(".bloc-supprimer").addEventListener("click", () => {
      bloc.remove();
    });

    bloc.querySelector(".bloc-monter").addEventListener("click", () => {
      const precedent = bloc.previousElementSibling;
      if (precedent) bloc.parentElement.insertBefore(bloc, precedent);
    });

    bloc.querySelector(".bloc-descendre").addEventListener("click", () => {
      const suivant = bloc.nextElementSibling;
      if (suivant) bloc.parentElement.insertBefore(suivant, bloc);
    });
  }


  /* =========================
     NUMÉROTATION MODULES
  ========================= */

  function renumeroterModules() {

    const modules = modulesContainer.querySelectorAll(".module");

    modules.forEach((module, index) => {
      module.querySelector(".module-numero").textContent = `Module ${index + 1}`;
    });

    compteurModules = modules.length;
  }


  /* =========================
     RÉCUPÉRER LES DONNÉES
     Même structure que js/guides-data.js : la page de lecture
     (guide-detail.html) peut donc l'afficher directement.
  ========================= */

  function recupererGuide() {

    const modules = [];

    document.querySelectorAll(".module").forEach((module, moduleIndex) => {

      const blocs = [];

      module.querySelectorAll(".bloc").forEach((bloc) => {

        const type = bloc.dataset.type;

        if (type === "image") {
          blocs.push({
            type: "image",
            src: bloc.dataset.src || "",
            legende: bloc.querySelector(".bloc-image-legende").value.trim()
          });
        } else if (type === "video") {
          blocs.push({
            type: "video",
            url: bloc.querySelector(".bloc-video-url").value.trim()
          });
        } else {
          // titre, soustitre, texte
          blocs.push({
            type: type,
            contenu: bloc.querySelector(".bloc-contenu").value.trim()
          });
        }
      });

      modules.push({
        ordre: moduleIndex + 1,
        titre: module.querySelector(".module-titre").value.trim(),
        description: module.querySelector(".module-description").value.trim(),
        blocs: blocs
      });
    });

    return {
      id: 0,
      titre: document.getElementById("guide-titre").value.trim(),
      categorie: document.getElementById("guide-categorie").value,
      resume: document.getElementById("guide-resume").value.trim(),
      auteur: nomAuteur,
      vues: 0,
      modules: modules
    };
  }


  /* =========================
     VALIDATION
  ========================= */

  function validerGuide(guide) {

    if (!guide.titre) {
      afficherMessage("Ajoute un titre à ton guide.", "erreur");
      return false;
    }

    if (!guide.resume) {
      afficherMessage("Ajoute un résumé à ton guide.", "erreur");
      return false;
    }

    if (guide.modules.length === 0) {
      afficherMessage("Ajoute au moins un module.", "erreur");
      return false;
    }

    for (const module of guide.modules) {

      if (!module.titre) {
        afficherMessage("Chaque module doit avoir un titre.", "erreur");
        return false;
      }

      if (module.blocs.length === 0) {
        afficherMessage(`Le module "${module.titre}" doit contenir au moins un bloc.`, "erreur");
        return false;
      }

      for (const bloc of module.blocs) {

        const nom = LIBELLES_BLOCS[bloc.type];

        if (bloc.type === "image") {
          if (!bloc.src) {
            afficherMessage(`Un bloc ${nom} du module "${module.titre}" n'a pas d'image.`, "erreur");
            return false;
          }
        } else if (bloc.type === "video") {
          if (!bloc.url) {
            afficherMessage(`Un bloc ${nom} du module "${module.titre}" n'a pas de lien.`, "erreur");
            return false;
          }
          if (!convertirEnUrlEmbed(bloc.url)) {
            afficherMessage(`Le lien vidéo du module "${module.titre}" n'est pas reconnu : utilise YouTube ou Vimeo.`, "erreur");
            return false;
          }
        } else if (!bloc.contenu) {
          afficherMessage(`Un bloc ${nom} du module "${module.titre}" est vide.`, "erreur");
          return false;
        }
      }
    }

    return true;
  }


  /* =========================
     APERÇU : ouvre la vraie page de lecture
  ========================= */

  btnApercu.addEventListener("click", () => {

    effacerMessage();

    const guide = recupererGuide();

    if (!validerGuide(guide)) return;

    try {
      localStorage.setItem("apercuGuide", JSON.stringify(guide));
    } catch (e) {
      afficherMessage("Contenu trop lourd pour l'aperçu : utilise des liens pour tes images.", "erreur");
      return;
    }

    window.open("guide-detail.html?brouillon=1", "_blank");
  });


  /* =========================
     SOUMISSION
  ========================= */

  btnSoumettre.addEventListener("click", async () => {

    effacerMessage();

    const guide = recupererGuide();

    if (!validerGuide(guide)) return;

    definirChargement(btnSoumettre, true, "Envoi en cours...");

    try {

      if (UTILISER_SUPABASE) {

        const { data: { session } } = await supabaseClient.auth.getSession();
        if (!session) throw new Error("Connecte-toi pour soumettre ta proposition.");

        const { error } = await supabaseClient
          .from("propositions")
          .insert({
            auteur_nom: nomAuteur,
            titre: guide.titre,
            categorie: guide.categorie,
            resume: guide.resume,
            contenu: guide.modules
          });

        if (error) throw error;

      } else {

        const liste = JSON.parse(localStorage.getItem("propositions") || "[]");
        liste.push({ ...guide, statut: "en_attente", soumisLe: new Date().toISOString() });
        localStorage.setItem("propositions", JSON.stringify(liste));

      }

    } catch (erreur) {

      definirChargement(btnSoumettre, false, "Soumettre ma proposition");
      afficherMessage("Envoi impossible : " + (erreur.message || "erreur inconnue"), "erreur");
      return;

    }

    // Succès : on vide le formulaire et on repart d'un module vide
    document.getElementById("guide-titre").value = "";
    document.getElementById("guide-resume").value = "";
    modulesContainer.innerHTML = "";
    compteurModules = 0;
    ajouterModule();

    definirChargement(btnSoumettre, false, "Soumettre ma proposition");
    afficherMessage("Proposition envoyée ! Elle sera relue avant publication.", "succes");
  });


  /* =========================
     DÉMARRAGE
  ========================= */

  // Le bouton "+ Ajouter un module"
  btnAjouterModule.addEventListener("click", ajouterModule);

  // Premier module affiché dès l'ouverture de la page
  ajouterModule();

  /* =========================
     ACCÈS RÉSERVÉ AUX MEMBRES
     Pas connecté -> envoyé sur la page d'inscription, puis ramené ici.
  ========================= */

  (async () => {
    try {
      if (typeof supabaseClient === "undefined") throw new Error("Supabase indisponible");

      const { data: { session } } = await supabaseClient.auth.getSession();

      if (!session) {
        // replace() : le bouton "retour" du navigateur ne crée pas de boucle
        window.location.replace("inscription.html?redirection=proposer-guide.html");
        return;   // la page reste cachée pendant la redirection
      }

      // Récupère le nom du membre (affiché comme auteur du guide)
      const { data: profil } = await supabaseClient
        .from("profils").select("nom").eq("id", session.user.id).single();
      if (profil && profil.nom) nomAuteur = profil.nom;

    } catch (e) {
      // Hors-ligne ou erreur : on affiche la page ; l'envoi redemandera de se connecter
    }

    // Vérification terminée : on montre la page
    document.body.classList.remove("verification-acces");
  })();

});
