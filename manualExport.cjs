// manualExport.js

const admin = require('firebase-admin');
const fs = require('fs');

// Remplace par ton chemin correct
const serviceAccount = require('./SAK/serviceAccountKeyDev.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const exportCollection = async (collectionName, outputFile) => {
  const snapshot = await db.collection(collectionName).get();
  const docs = [];

  snapshot.forEach(doc => {
    docs.push({ id: doc.id, data: doc.data() });
  });

  fs.writeFileSync(outputFile, JSON.stringify(docs, null, 2));
  console.log(`✅ Exported ${docs.length} documents from "${collectionName}" to ${outputFile}`);
};

exportCollection('category_type', 'category_type_export.json');
