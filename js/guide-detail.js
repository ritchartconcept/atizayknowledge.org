// Les noms de catégories (labelsCategories) viennent de js/guides-data.js ;
// le guide lui-même est lu dans Supabase (table "guides").

// --- 1. Récupérer le guide demandé via l'adresse : guide-detail.html?id=3 ---
const params = new URLSearchParams(window.location.search);
const idGuide = params.get('id');                       // identifiant Supabase (texte)
const modeApercu = params.get('brouillon') === '1';

let guide = null;
let moduleActif = 0;

const zoneIntrouvable = document.getElementById('introuvable');
const zoneContenu = document.getElementById('guide-contenu');

// Charge le guide : aperçu (depuis le navigateur) ou guide publié (depuis Supabase)
async function chargerGuide() {
  if (modeApercu) {
    try { guide = JSON.parse(localStorage.getItem('apercuGuide')); } catch (e) {}
  } else if (idGuide && typeof supabaseClient !== 'undefined') {
    const { data, error } = await supabaseClient
      .from('guides')
      .select('id, titre, categorie, resume, auteur_nom, vues, modules')
      .eq('id', idGuide)
      .eq('publie', true)
      .maybeSingle();
    if (!error && data) guide = Object.assign({}, data, { auteur: data.auteur_nom || 'Membre' });
  }
  // Un guide sans module ne peut pas s'afficher
  if (guide && (!Array.isArray(guide.modules) || guide.modules.length === 0)) guide = null;
}

chargerGuide().then(function () {
  if (!guide) {
    zoneIntrouvable.style.display = 'block';
    return;
  }
  zoneContenu.style.display = 'block';

  // Compte une vue par guide et par visite (pas en mode aperçu)
  if (!modeApercu && typeof supabaseClient !== 'undefined') {
    const cle = 'vu_' + idGuide;
    if (!sessionStorage.getItem(cle)) {
      sessionStorage.setItem(cle, '1');
      supabaseClient.rpc('incrementer_vues', { p_guide_id: idGuide });
      guide.vues = (guide.vues || 0) + 1;
    }
  }
  afficherEnteteGuide();
  construireSommaire();
  afficherModule(0);
});


// --- 2. En-tête du guide (titre, catégorie, auteur, vues) ---
function afficherEnteteGuide() {
  if (modeApercu) {
    const bandeau = document.createElement('div');
    bandeau.className = 'bandeau-apercu';
    bandeau.textContent = "Aperçu : ce guide n'est pas encore publié.";
    zoneContenu.insertBefore(bandeau, zoneContenu.firstChild);
  }
  document.title = guide.titre + " — Atizay Knowledge";
  document.getElementById('guide-categorie').textContent = labelsCategories[guide.categorie] || guide.categorie;
  document.getElementById('guide-titre').textContent = guide.titre;
  document.getElementById('guide-resume').textContent = guide.resume || '';
  document.getElementById('guide-avatar').textContent = guide.auteur.charAt(0);
  document.getElementById('guide-auteur-nom').textContent = guide.auteur;
  document.getElementById('guide-vues').textContent = guide.vues + " vues";
}

// --- 3. Sommaire : un bouton par module ---
function construireSommaire() {
  const liste = document.getElementById('sommaire-liste');
  liste.innerHTML = '';

  guide.modules.forEach(function (module, index) {
    const li = document.createElement('li');
    const btn = document.createElement('button');

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = index + 1;

    const titre = document.createElement('span');
    titre.textContent = module.titre;

    btn.appendChild(num);
    btn.appendChild(titre);
    btn.addEventListener('click', function () { afficherModule(index); });

    li.appendChild(btn);
    liste.appendChild(li);
  });
}

// --- 4. Afficher un module (titre + blocs texte/image/vidéo) ---
function afficherModule(index) {
  moduleActif = index;
  const module = guide.modules[index];
  const total = guide.modules.length;

  document.getElementById('module-numero').textContent = "Module " + (index + 1) + " sur " + total;
  document.getElementById('module-titre').textContent = module.titre;

  // On construit les blocs avec createElement + textContent (et non innerHTML)
  // pour qu'un contenu écrit par un membre ne puisse jamais injecter de code.
  const conteneur = document.getElementById('module-blocs');
  conteneur.innerHTML = '';

  // Description du module (champ facultatif de la page "Proposer un guide")
  if (module.description) {
    const intro = document.createElement('p');
    intro.className = 'bloc-texte module-intro';
    intro.textContent = module.description;
    conteneur.appendChild(intro);
  }
  module.blocs.forEach(function (bloc) {
    const element = creerBloc(bloc);
    if (element) conteneur.appendChild(element);
  });

  // Sommaire : surligne le module actif
  document.querySelectorAll('.sommaire-liste button').forEach(function (btn, i) {
    btn.classList.toggle('actif', i === index);
  });

  // Barre de progression
  document.getElementById('progression-barre').style.width = ((index + 1) / total * 100) + '%';

  // Boutons précédent / suivant
  document.getElementById('btn-precedent').disabled = (index === 0);
  const btnSuivant = document.getElementById('btn-suivant');
  btnSuivant.disabled = (index === total - 1);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- 5. Création d'un bloc selon son type ---
function creerBloc(bloc) {
  if (bloc.type === 'titre') {
    const h = document.createElement('h3');
    h.className = 'bloc-titre';
    h.textContent = bloc.contenu;
    return h;
  }

  if (bloc.type === 'soustitre') {
    const h = document.createElement('h4');
    h.className = 'bloc-soustitre';
    h.textContent = bloc.contenu;
    return h;
  }

  if (bloc.type === 'texte') {
    const p = document.createElement('p');
    p.className = 'bloc-texte';
    p.textContent = bloc.contenu;
    return p;
  }

  if (bloc.type === 'image') {
    const figure = document.createElement('figure');
    figure.className = 'bloc-image';
    const img = document.createElement('img');
    img.src = bloc.src;
    img.alt = bloc.legende || '';
    figure.appendChild(img);
    if (bloc.legende) {
      const legende = document.createElement('figcaption');
      legende.textContent = bloc.legende;
      figure.appendChild(legende);
    }
    return figure;
  }

  if (bloc.type === 'video') {
    const urlEmbed = convertirEnUrlEmbed(bloc.url);
    if (!urlEmbed) return null; // lien non reconnu : on n'affiche rien
    const wrap = document.createElement('div');
    wrap.className = 'bloc-video';
    const iframe = document.createElement('iframe');
    iframe.src = urlEmbed;
    iframe.title = 'Vidéo du guide';
    iframe.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    wrap.appendChild(iframe);
    return wrap;
  }

  return null;
}

// --- 6. Convertit un lien YouTube/Vimeo normal en lien "embed" ---
// Seuls YouTube et Vimeo sont acceptés ; tout autre lien est ignoré.
function convertirEnUrlEmbed(url) {
  try {
    const u = new URL(url);
    const hote = u.hostname.replace('www.', '');

    if (hote === 'youtube.com' || hote === 'm.youtube.com') {
      const id = u.searchParams.get('v');
      if (id) return 'https://www.youtube.com/embed/' + id;
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (hote === 'youtu.be') {
      return 'https://www.youtube.com/embed/' + u.pathname.slice(1);
    }
    if (hote === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return 'https://player.vimeo.com/video/' + id;
    }
    if (hote === 'player.vimeo.com') return url;
  } catch (e) {
    // URL invalide
  }
  return null;
}

// --- 7. Boutons précédent / suivant ---
document.getElementById('btn-precedent').addEventListener('click', function () {
  if (moduleActif > 0) afficherModule(moduleActif - 1);
});

document.getElementById('btn-suivant').addEventListener('click', function () {
  if (guide && moduleActif < guide.modules.length - 1) afficherModule(moduleActif + 1);
});
