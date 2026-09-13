const admin = require('firebase-admin');
const fs = require('fs');

// Initialise Firebase
const serviceAccount = require('./SAK/serviceAccountKeyProd.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// 🔁 Fonction d'import
const importCollection = async (collectionName, inputFile) => {
  const rawData = fs.readFileSync(inputFile);
  const documents = JSON.parse(rawData);

  for (const doc of documents) {
    const docRef = db.collection(collectionName).doc(doc.id);
    await docRef.set(doc.data);
    console.log(`📄 Imported doc: ${doc.id}`);
  }

  console.log(`✅ Imported ${documents.length} documents into "${collectionName}"`);
};

// ⚙️ Utilisation
importCollection('category_type', 'category_type_export.json');
