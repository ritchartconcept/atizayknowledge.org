document.getElementById('form-inscription').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nom = document.getElementById('nom').value;
  const email = document.getElementById('email').value;
  const discipline = document.getElementById('discipline').value;
  const motDePasse = document.getElementById('password').value;
  const confirmation = document.getElementById('password2').value;
  const erreurBox = document.getElementById('erreur-inscription');
  const boutonSubmit = e.target.querySelector('.btn-submit');
  const texteOriginal = boutonSubmit.textContent;

  // Vérification avant de lancer le chargement
  if (motDePasse !== confirmation) {
    alert('Les deux mots de passe ne correspondent pas.');
    return;
  }

  // Cache l'ancien message à chaque nouvelle tentative
  erreurBox.style.display = 'none';

  // --- Début du chargement ---
  boutonSubmit.disabled = true;
  boutonSubmit.classList.add('chargement');
  boutonSubmit.textContent = 'Création du compte...';

  const { data, error } = await supabaseClient.auth.signUp({
    email: email,
    password: motDePasse,
    options: {
      data: { nom: nom, discipline: discipline }
    }
  });

  if (error) {
    boutonSubmit.disabled = false;
    boutonSubmit.classList.remove('chargement');
    boutonSubmit.textContent = texteOriginal;

    erreurBox.textContent = error.message;
    erreurBox.style.display = 'block';
    return;
  }

  // Si la confirmation d'email est activée, il n'y a pas encore de session.
  if (!data.session) {
    boutonSubmit.disabled = false;
    boutonSubmit.classList.remove('chargement');
    boutonSubmit.textContent = texteOriginal;

    erreurBox.style.background = '#e2f0e8';
    erreurBox.style.color = '#3A7D5C';
    erreurBox.style.borderColor = '#3A7D5C';
    erreurBox.textContent = "Compte créé ! Vérifie tes emails pour confirmer ton adresse avant de te connecter.";
    erreurBox.style.display = 'block';
    return;
  }

 window.location.href = destinationApresConnexion();
});
