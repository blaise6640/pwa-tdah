# Migration: Config par Organisation

## 📋 Résumé des modifications

La configuration des dépenses (catégories et fournisseurs) est maintenant stockée au niveau de chaque organisation dans `config/{orgId}` au lieu d'un document global `config/global`.

### Avantages
- ✅ Configuration personnalisée par organisation
- ✅ Isolation des données entre clients
- ✅ Meilleure sécurité avec règles Firestore granulaires
- ✅ Support multi-tenant véritable
- ✅ **Initialisation automatique** lors de la création d'organisation (depuis novembre 2025)

## 🆕 Initialisation automatique de la config

**Depuis novembre 2025**, lors de la création d'une nouvelle organisation :
- La configuration est **automatiquement initialisée** en copiant `config/global` vers `config/{orgId}`
- Seuls `expenseCategories` et `vendors` sont copiés
- Les fréquences (`EXPENSE_FREQUENCIES`) et modes de lissage (`REGULARIZATION_MODES`) restent hardcodés dans `src/settings/expenses.ts`
- Si `config/global` n'existe pas, une config vide est créée (`expenseCategories: [], vendors: []`)
- Les métadonnées suivantes sont automatiquement ajoutées :
  - `createdAt` : timestamp de création
  - `createdBy` : email/UID de l'utilisateur créateur
  - `updatedAt` : timestamp de dernière modification
  - `updatedBy` : email/UID du dernier modificateur

### Points de création automatique
1. **Création manuelle** : via le bouton "Créer une organisation" dans `OrganizationsPage.tsx`
2. **Création automatique** : lors de la première connexion d'un utilisateur (si implémenté)

### Code concerné
- **`src/lib/orgConfig.ts`** : fonction `initializeOrgConfig(db, orgId, createdBy?)`
- **`src/components/CreateOrganization.tsx`** : appel à `initializeOrgConfig` après création de l'org

### Comportement en cas d'erreur
Si `initializeOrgConfig` échoue :
- ✅ La création de l'organisation **continue normalement**
- ⚠️ L'erreur est loggée dans la console
- 📝 L'organisation aura une config vide
- 🔧 L'admin peut configurer manuellement via `/organizations/{orgId}/settings/expenses`

### Pour les organisations existantes
Pour les organisations créées **avant** cette fonctionnalité (novembre 2025), utiliser le script de migration :
```bash
node scripts/migrate/migrate-config-to-orgs.cjs migrate
node scripts/migrate/migrate-config-to-orgs.cjs verify
```

## 📂 Fichiers modifiés

### Helpers (core logic)
- **`src/lib/orgConfig.ts`**
  - `getExpenseConfig(db, orgId)` : orgId maintenant obligatoire
  - `updateExpenseConfig(db, orgId, data, updatedBy?)` : orgId maintenant obligatoire
  - Lit/écrit `config/{orgId}` au lieu de `config/global`

- **`src/lib/expenseCategories.ts`**
  - `getExpenseCategories(db, orgId)` : orgId maintenant obligatoire
  - Délègue à `getExpenseConfig(db, orgId)`

### Composants UI
- **`src/pages/OrgExpenseSettingsPage.tsx`**
  - Passe `db` et `orgId` aux helpers
  - Charge la config spécifique à l'organisation

- **`src/components/payments/NewPaymentDialog.tsx`**
  - Passe `orgId` à `getExpenseConfig(null, orgId)`

- **`src/components/OrganizationDetails.tsx`**
  - Charge la config expenses pour chaque organisation affichée
  - Affiche un résumé (nombre de catégories et vendors) sur chaque carte
  - Ajoute un bouton "Paramètres dépenses" vers `/organizations/{orgId}/settings/expenses`

### Tests
- **`src/lib/__tests__/orgConfig.test.ts`** (nouveau)
  - Tests unitaires pour `getExpenseConfig` et `updateExpenseConfig`
  - Mocks Firestore
  - Couverture des cas d'erreur et nominal

- **`src/lib/__tests__/expenseCategories.test.ts`** (nouveau)
  - Tests unitaires pour `getExpenseCategories`
  - Vérification du tri et du filtrage

### Documentation
- **`docs/FIRESTORE_RULES_CONFIG.md`** (nouveau)
  - Règles Firestore recommandées pour `config/{orgId}`
  - Contrôle d'accès basé sur l'appartenance à l'organisation
  - Instructions de déploiement

### Scripts
- **`scripts/migrate/migrate-config-to-orgs.cjs`** (nouveau)
  - Script de migration Node.js
  - Copie `config/global` → `config/{orgId}` pour chaque org
  - Commande de vérification incluse

## 🚀 Déploiement

### Étape 1: Tests locaux
```bash
# Lancer les tests unitaires
npm run test

# Démarrer l'app en local
npm run dev

# Vérifier /organizations affiche bien les configs
```

### Étape 2: Migration des données (PRODUCTION)
```bash
# Exécuter le script de migration
node scripts/migrate/migrate-config-to-orgs.cjs migrate

# Vérifier que tout s'est bien passé
node scripts/migrate/migrate-config-to-orgs.cjs verify
```

### Étape 3: Déployer le code
```bash
# Build et déploiement
npm run build
firebase deploy
```

### Étape 4: Mettre à jour les règles Firestore
```bash
# Modifier firestore_rules avec les règles de docs/FIRESTORE_RULES_CONFIG.md
# Puis déployer
firebase deploy --only firestore:rules
```

## 🧪 Vérification post-déploiement

1. **Tester lecture config**
   - Se connecter avec un utilisateur membre d'une org
   - Aller sur `/organizations`
   - Vérifier que les cartes affichent bien le nombre de catégories et vendors
   - Cliquer sur "Paramètres dépenses" → devrait charger la config

2. **Tester écriture config**
   - Sur `/organizations/{orgId}/settings/expenses`
   - Ajouter/supprimer une catégorie
   - Vérifier que les changements persistent

3. **Tester isolation**
   - Créer 2 organisations différentes
   - Modifier la config de l'org A
   - Vérifier que l'org B conserve sa config originale

## ⚠️ Points d'attention

### Règles Firestore temporaires
Actuellement, les règles sont en mode ouvert (`allow read, write: if request.auth != null`). 
**IMPORTANT**: Remplacer par des règles restrictives avant production (voir `docs/FIRESTORE_RULES_CONFIG.md`).

### Suppression de config/global
Ne PAS supprimer `config/global` immédiatement après la migration.
- Attendre quelques jours pour valider que tout fonctionne
- Vérifier qu'aucun code backend ne référence encore config/global
- Ensuite seulement, supprimer manuellement via console Firebase

### Performances
Le composant `OrganizationDetails` charge la config en parallèle pour toutes les orgs.
Si un utilisateur a beaucoup d'orgs (>10), considérer un chargement lazy/on-demand.

## 🐛 Dépannage

### Erreur "orgId is required"
- Vérifier que tous les appels à `getExpenseConfig` et `updateExpenseConfig` passent bien `orgId`
- Vérifier le contexte (page/composant) pour récupérer `orgId` (via `useParams()` ou props)

### Config vide pour une org
- Vérifier que le script de migration a bien été exécuté
- Vérifier manuellement dans Firebase Console si `config/{orgId}` existe
- Relancer le script de migration si nécessaire

### Tests échouent
```bash
# Vérifier que vitest est installé
npm install -D vitest

# Lancer les tests avec logs détaillés
npm run test -- --reporter=verbose
```

## 📊 Métriques

### Appels Firestore
- **Avant**: 1 lecture `config/global` par utilisateur/session
- **Après**: N lectures `config/{orgId}` (N = nombre d'orgs de l'utilisateur)

Pour optimiser :
- Ajouter un cache mémoire dans `OrganizationDetails`
- Utiliser React Context pour partager la config entre composants
- Implémenter un système de cache côté client (localStorage)

### Sécurité
- **Avant**: Tous les utilisateurs authentifiés lisent/écrivent config/global
- **Après**: Utilisateurs lisent uniquement la config de leurs orgs, admins écrivent

## 📝 TODO post-migration

- [ ] Déployer les règles Firestore restrictives
- [ ] Ajouter un cache pour les configs dans OrganizationDetails
- [ ] Monitorer les performances (nombre de reads Firestore)
- [ ] Documenter le processus d'ajout de vendors dans la config
- [ ] Considérer l'ajout d'un audit log pour les modifications de config
- [ ] Après 1 semaine de validation, supprimer `config/global`

## 🔗 Ressources

- Documentation Firestore Rules: https://firebase.google.com/docs/firestore/security/rules-structure
- Vitest Documentation: https://vitest.dev/
- Firebase Admin SDK: https://firebase.google.com/docs/admin/setup
