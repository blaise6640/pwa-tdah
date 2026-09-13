rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonctions d'aide pour éviter la duplication de code
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    
    function hasRole(roles) {
      return isAuthenticated() && getUserData().role in roles;
    }
    
    function isAdmin() {
      return hasRole(["Admin", "Developpeur", "Patron"]);
    }
    
    function isEmployee() {
      return hasRole(["Employe"]);
    }
    
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    match /users/{userId} {
      // L'utilisateur peut lire et modifier son propre profil
      allow read, update, create: if isOwner(userId);
      
      // Les administrateurs peuvent lire, lister et modifier tous les profils
      allow read, list, update: if isAdmin();
      
      // Les employés peuvent seulement lire et lister
      allow read, list: if isEmployee();
    }

    match /categories/{categoryId} {
      // Les administrateurs peuvent tout faire
      allow read, write: if isAdmin();
      
      // Les employés peuvent seulement lire
      allow read: if isEmployee();
    }
    
    match /response_types/{responsetypeId} {
      allow read, write: if isAdmin();
    }

    match /reponses/{reponsesId} {
      // Tout utilisateur connecté peut créer et lire
      allow create, read: if isAuthenticated();
      
      // Seuls les administrateurs peuvent supprimer ou modifier
      allow update, delete: if isAdmin();
    }
    
    match /signalements_types/{signalements_typesId} {
      // Tout utilisateur connecté peut lire
      allow read: if isAuthenticated();
      
      // Seuls les administrateurs peuvent créer, modifier ou supprimer
      allow write: if isAdmin();
    }

    match /signalements/{signalementsId} {
      // Tout utilisateur connecté peut créer et lire
      allow create, read: if isAuthenticated();
      
      // Seuls les administrateurs peuvent modifier ou supprimer
      allow update, delete: if isAdmin();
    }

    match /category_type/{categorytypeId} {
      allow read: if isAuthenticated();
      allow read, write: if isAdmin();
    }

    match /questions/{questionId} {
      // Tout utilisateur connecté peut créer, lire et modifier des questions
      allow create, read, update: if isAuthenticated();
      
      // Seuls les administrateurs peuvent supprimer
      allow delete: if isAdmin();
    }
    
    match /assignations/{assignationsId} {
      // Tout utilisateur connecté peut créer, lire et modifier
      allow create, read, update: if isAuthenticated();
      
      // Seuls les administrateurs peuvent supprimer
      allow delete: if isAdmin();
    }

    // Collections "back_" réservées aux administrateurs
    match /back_questions/{back_questionsId} {
      allow read, write: if isAdmin();
    }
    
    match /back_reponses/{back_reponsesId} {
      allow read, write: if isAdmin();
    }
    
    match /back_assignations/{back_assignationsId} {
      allow read, write: if isAdmin();
    }
    
    match /back_signalements/{back_signalementsId} {
      allow read, write: if isAdmin();
    }
  }
}
