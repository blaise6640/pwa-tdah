Définir et voir les secrets avec Firebase CLI
Définir des secrets
Pour créer ou mettre à jour un secret Firebase:

Exemple:

La CLI vous demandera ensuite de saisir la valeur (de manière masquée).

Voir les secrets
Pour lister tous les secrets disponibles:

Cela affiche les noms des secrets et leurs versions, mais pas les valeurs.

Pour voir les métadonnées d'un secret spécifique:

Important à savoir
Vous ne pouvez pas récupérer la valeur d'un secret une fois défini.
Pour le projet actuel, travaillez avec gestion-locative-dev (environnement de développement).
Il faut définir les secrets GMAIL_USER, GMAIL_PASS et MOLLIE_API_KEY pour résoudre l'erreur précédente.
N'oubliez pas de vous connecter d'abord avec firebase login et de sélectionner votre projet avec firebase use gestion-locative-dev.