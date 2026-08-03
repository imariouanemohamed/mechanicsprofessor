MECHANICSPROFESSOR.COM — MP LABS / NEWSLETTER
=============================================

Cette archive contient la version complète du site prête à remplacer la
version actuellement publiée.

NOUVEAUTÉ NEWSLETTER
--------------------
- nouvelle section newsletter intégrée à la page principale ;
- formulaire Brevo avec consentement, double opt-in et reCAPTCHA ;
- affichage responsive pour ordinateur, tablette et téléphone ;
- lien Newsletter ajouté dans le pied de page.

NOUVEAUTÉS DE L'ÉTAPE 2
-----------------------
- nouveau laboratoire Bernoulli & Energy Equation entièrement fonctionnel ;
- parcours Predict → Build → Simulate → Verify ;
- choix entre écoulement idéal et écoulement réel ;
- cinq fluides avec masse volumique et viscosité ;
- calcul de Q, V1, V2, débit massique, Re1 et Re2 ;
- identification du régime laminaire, transitoire ou turbulent ;
- pertes linéaires de Darcy-Weisbach et pertes singulières ;
- facteur de frottement laminaire ou corrélation de Swamee-Jain ;
- calcul au choix de la pression p2 ou de la hauteur de pompe Hp ;
- vérification terme par terme de l'équation de Bernoulli étendue ;
- calcul du résidu numérique et avertissements de validité ;
- schéma dynamique qui réagit aux diamètres, pressions et altitudes.

L'ancien Hydraulic Lab reste entièrement supprimé. Cette nouvelle expérience
a été construite à partir de zéro selon la nouvelle vision MP Labs.

REMPLACEMENT DANS VS CODE
-------------------------
1. Décompressez l'archive téléchargée.
2. Ouvrez votre dossier local :
   C:\Users\Dell Pro\mechanicsprofessor
3. Supprimez les anciens fichiers suivants s'ils existent encore :
   - hydraulic-lab.html
   - hydraulic-lab.css
   - hydraulic-lab.js
   - assets\hydraulic-pump.png
4. Copiez TOUT le contenu du dossier décompressé dans le dossier du site.
5. Acceptez le remplacement des fichiers existants.
6. Dans le terminal VS Code, exécutez :

   git add -A
   git commit -m "Add Bernoulli scientific engine"
   git push

Cloudflare mettra automatiquement le site en ligne après le push.

PAGES PRINCIPALES
-----------------
https://mechanicsprofessor.com/labs/
https://mechanicsprofessor.com/labs/fluid-mechanics/bernoulli/

MÉTHODE SCIENTIFIQUE
--------------------
Toutes les entrées sont converties en unités SI dans le moteur. Les pressions
sont des pressions manométriques. Le facteur de Darcy est calculé par f=64/Re
en régime laminaire et par la corrélation explicite de Swamee-Jain en régime
turbulent. La zone de transition est interpolée et signalée comme incertaine.

Le laboratoire est un outil pédagogique. Les avertissements intégrés doivent
être consultés lorsque les hypothèses d'écoulement permanent, incompressible et
unidimensionnel ne sont plus adaptées.
