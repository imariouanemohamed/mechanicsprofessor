MECHANICSPROFESSOR.COM — MP LABS / ÉTAPE 1
==========================================

Cette archive contient la version complète du site prête à remplacer la
version actuelle, avec :

- la page d'accueil et toutes ses sections actuelles ;
- les trois publications et leurs boutons DOI ;
- le formulaire de contact vers imariouanemohamed@gmail.com ;
- la photo du professeur ;
- la nouvelle plateforme MP Labs ;
- les trois disciplines : mécanique des fluides, mécanique des solides et
  sciences thermiques ;
- le parcours Predict → Build → Simulate → Verify → Challenge ;
- la feuille de route de 12 nouveaux laboratoires ;
- la page conceptuelle du futur laboratoire Bernoulli Principle.

IMPORTANT
---------
L'ancien Hydraulic Lab a été entièrement supprimé. Le futur laboratoire de
Bernoulli sera construit à partir de zéro selon la nouvelle vision.

REMPLACEMENT DANS VS CODE
-------------------------
1. Décompressez l'archive téléchargée.
2. Ouvrez votre dossier local :
   C:\Users\Dell Pro\mechanicsprofessor
3. Supprimez dans votre dossier local les anciens fichiers suivants s'ils
   sont encore présents :
   - hydraulic-lab.html
   - hydraulic-lab.css
   - hydraulic-lab.js
   - assets\hydraulic-pump.png
4. Copiez TOUT le contenu du dossier décompressé dans le dossier du site.
5. Acceptez le remplacement des fichiers existants.
6. Vérifiez que index.html et le dossier labs se trouvent à la racine.
7. Dans le terminal VS Code, exécutez :

   git add -A
   git commit -m "Launch MP Labs phase 1"
   git push

Cloudflare mettra automatiquement le site en ligne après le push.

NOUVELLES PAGES
---------------
https://mechanicsprofessor.com/labs/
https://mechanicsprofessor.com/labs/fluid-mechanics/bernoulli/

PROCHAINE ÉTAPE
---------------
Construire le nouveau moteur scientifique du laboratoire Bernoulli : unités,
propriétés des fluides, bilan énergétique et vérification numérique.
