# Guide de développement : Émulateur Firebase et Seed

## Lancer l'émulateur Firebase

1. Assurez-vous que Firebase CLI est installé et configuré.
2. Démarrez l'émulateur avec la commande suivante :

```bash
firebase emulators:start
```

## Exécuter le seed de données

1. Une fois l'émulateur démarré, exécutez le script de seed pour peupler la base de données Firestore avec des données de test :

```bash
npm run seed:dev
```

Cela ajoutera des utilisateurs, des organisations et leurs relations dans l'émulateur Firestore.

## Vérification des données

1. Accédez à l'interface de l'émulateur Firebase à l'adresse suivante :

```
http://localhost:4000
```

2. Naviguez vers Firestore pour vérifier les données seedées.