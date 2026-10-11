document.getElementById('form-connexion').addEventListener('submit', async function (e) {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const motDePasse = document.getElementById('password').value;
  const erreurBox = document.getElementById('erreur-connexion');
  const boutonSubmit = e.target.querySelector('.btn-submit');
  const texteOriginal = boutonSubmit.textContent;

  // Cache l'ancien message d'erreur à chaque nouvelle tentative
  erreurBox.style.display = 'none';

  // --- Début du chargement ---
  boutonSubmit.disabled = true;
  boutonSubmit.classList.add('chargement');
  boutonSubmit.textContent = 'Connexion en cours...';

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: motDePasse
  });

  if (error) {
    // --- Échec : on remet le bouton dans son état normal ---
    boutonSubmit.disabled = false;
    boutonSubmit.classList.remove('chargement');
    boutonSubmit.textContent = texteOriginal;

    erreurBox.textContent = "Email ou mot de passe incorrect.";
    erreurBox.style.display = 'block';
    return;
  }

  // Succès : le spinner reste affiché jusqu'au changement de page
 window.location.href = destinationApresConnexion();
});
