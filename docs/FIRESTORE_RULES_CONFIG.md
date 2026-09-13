# Règles Firestore pour config/{orgId}

## Contexte
Les paramètres de dépenses (catégories et fournisseurs) sont maintenant stockés au niveau de chaque organisation dans `config/{orgId}` au lieu de `config/global`.

## Règles recommandées

### Accès lecture
- Tous les membres d'une organisation doivent pouvoir lire la config de leur organisation
- Vérifier que l'utilisateur est membre via `users/{userId}.orgIds`

### Accès écriture
- Uniquement les administrateurs/managers d'une organisation
- Ou utiliser un rôle spécifique défini dans le document `orgs/{orgId}`

## Exemple de règles Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function isMemberOfOrg(orgId) {
      return isAuthenticated() 
        && orgId in getUserData().orgIds;
    }
    
    function isAdminOfOrg(orgId) {
      // Option 1: Vérifier un rôle global
      return isAuthenticated() 
        && getUserData().role == 'Admin';
      
      // Option 2: Vérifier un rôle au niveau de l'org (si vous avez un mapping orgId -> role)
      // return isAuthenticated()
      //   && get(/databases/$(database)/documents/orgs/$(orgId)).data.admins[request.auth.uid] == true;
    }
    
    // Règles pour config/{orgId}
    match /config/{orgId} {
      // Lecture: tous les membres de l'organisation
      allow read: if isMemberOfOrg(orgId);
      
      // Écriture: uniquement les admins
      allow write: if isAdminOfOrg(orgId);
      
      // Alternative plus permissive: tous les membres peuvent écrire
      // allow write: if isMemberOfOrg(orgId);
    }
    
    // Autres collections...
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    match /orgs/{orgId} {
      allow read: if isMemberOfOrg(orgId);
      allow write: if isAdminOfOrg(orgId);
    }
    
    // ... autres règles pour properties, leases, expenses, etc.
  }
}
```

## Points d'attention

1. **Performance des règles**
   - Les fonctions `get()` dans les règles comptent comme des lectures et ont un coût
   - Mettre en cache les données utilisateur si possible
   - Limiter le nombre de `get()` imbriqués

2. **Sécurité**
   - Ne jamais faire confiance aux données côté client
   - Toujours valider que l'utilisateur a accès à l'organisation
   - Considérer l'ajout de timestamps pour éviter les modifications non autorisées

3. **Migration**
   - Actuellement, les règles sont en mode ouvert (`allow read, write: if request.auth != null`)
   - **IMPORTANT**: Mettre à jour les règles avant de déployer en production
   - Tester les règles avec l'émulateur Firestore avant déploiement

4. **Structure de données utilisateur attendue**
   ```typescript
   // users/{userId}
   {
     email: string,
     firstName: string,
     lastName: string,
     orgIds: string[], // Liste des organisations dont l'utilisateur est membre
     role?: 'Admin' | 'User', // Rôle global (optionnel)
     createdAt: Timestamp,
     updatedAt: Timestamp
   }
   ```

5. **Structure de données organisation attendue**
   ```typescript
   // orgs/{orgId}
   {
     name: string,
     type?: string,
     billingPlan?: string,
     createdAt: Timestamp,
     createdBy: string,
     // Optionnel: mapping des rôles par utilisateur
     admins?: { [userId: string]: boolean },
     members?: { [userId: string]: boolean }
   }
   ```

## Déploiement des règles

```bash
# Tester avec l'émulateur
firebase emulators:start

# Déployer uniquement les règles
firebase deploy --only firestore:rules

# Déployer tout
firebase deploy
```

## TODO avant production
- [ ] Remplacer les règles temporaires par les règles restrictives ci-dessus
- [ ] Tester l'accès avec différents rôles utilisateurs
- [ ] Vérifier que les admins peuvent écrire dans config/{orgId}
- [ ] Vérifier que les membres peuvent uniquement lire
- [ ] Vérifier que les non-membres ne peuvent pas accéder à config/{orgId}
