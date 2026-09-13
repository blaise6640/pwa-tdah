/**
 * Script de migration: config/global → config/{orgId}
 * 
 * Ce script copie la configuration globale des dépenses vers chaque organisation.
 * À exécuter UNE SEULE FOIS après le déploiement du nouveau code.
 * 
 * Usage:
 *   node scripts/migrate/migrate-config-to-orgs.cjs
 * 
 * Prérequis:
 *   - Firebase Admin SDK configuré
 *   - Credentials Firebase disponibles
 *   - Collection 'orgs' contenant toutes les organisations
 */

const admin = require('firebase-admin');

// Initialiser Firebase Admin
// Note: Assurez-vous d'avoir défini GOOGLE_APPLICATION_CREDENTIALS ou utilisez serviceAccountKey
try {
  admin.initializeApp();
} catch (e) {
  console.error('Erreur initialisation Firebase Admin:', e.message);
  process.exit(1);
}

const db = admin.firestore();

async function migrateConfigToOrgs() {
  console.log('🚀 Début de la migration config/global → config/{orgId}');
  
  try {
    // 1. Lire la config globale actuelle
    console.log('\n📖 Lecture de config/global...');
    const globalConfigRef = db.doc('config/global');
    const globalSnap = await globalConfigRef.get();
    
    if (!globalSnap.exists) {
      console.warn('⚠️  Aucune config globale trouvée. Rien à migrer.');
      return;
    }
    
    const globalData = globalSnap.data();
    console.log('✅ Config globale récupérée:');
    console.log('   - expenseCategories:', globalData.expenseCategories?.length || 0);
    console.log('   - vendors:', globalData.vendors?.length || 0);
    
    // 2. Récupérer toutes les organisations
    console.log('\n📋 Récupération des organisations...');
    const orgsSnap = await db.collection('orgs').get();
    
    if (orgsSnap.empty) {
      console.warn('⚠️  Aucune organisation trouvée. Rien à migrer.');
      return;
    }
    
    const orgIds = orgsSnap.docs.map(doc => doc.id);
    console.log(`✅ ${orgIds.length} organisation(s) trouvée(s):`, orgIds);
    
    // 3. Copier la config vers chaque organisation
    console.log('\n📝 Migration en cours...');
    const batch = db.batch();
    let count = 0;
    
    for (const orgId of orgIds) {
      const orgConfigRef = db.doc(`config/${orgId}`);
      
      // Vérifier si la config existe déjà
      const existingSnap = await orgConfigRef.get();
      if (existingSnap.exists) {
        console.log(`   ⏭️  config/${orgId} existe déjà, passage à la suivante`);
        continue;
      }
      
      // Copier les données
      const dataToMigrate = {
        expenseCategories: globalData.expenseCategories || [],
        vendors: globalData.vendors || [],
        migratedFrom: 'config/global',
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'migration-script',
      };
      
      batch.set(orgConfigRef, dataToMigrate);
      count++;
      console.log(`   ✅ config/${orgId} préparé pour migration`);
    }
    
    // 4. Valider les changements
    if (count === 0) {
      console.log('\n✅ Aucune migration nécessaire, toutes les configs existent déjà.');
      return;
    }
    
    console.log(`\n💾 Écriture de ${count} configuration(s)...`);
    await batch.commit();
    console.log('✅ Migration réussie !');
    
    // 5. Résumé
    console.log('\n📊 Résumé:');
    console.log(`   - Organisations trouvées: ${orgIds.length}`);
    console.log(`   - Configs migrées: ${count}`);
    console.log(`   - Configs déjà existantes: ${orgIds.length - count}`);
    
    // 6. Suggestion de sauvegarde
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. Vérifiez que les données ont été migrées correctement');
    console.log('   2. Testez l\'application avant de supprimer config/global');
    console.log('   3. Gardez une sauvegarde de config/global pendant quelques jours');
    console.log('\n💡 Pour supprimer config/global plus tard (après validation):');
    console.log('   await db.doc("config/global").delete();');
    
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error);
    throw error;
  }
}

// Fonction pour vérifier la migration
async function verifyMigration() {
  console.log('\n🔍 Vérification de la migration...');
  
  try {
    const orgsSnap = await db.collection('orgs').get();
    const orgIds = orgsSnap.docs.map(doc => doc.id);
    
    console.log(`\nVérification de ${orgIds.length} organisation(s):`);
    
    for (const orgId of orgIds) {
      const configSnap = await db.doc(`config/${orgId}`).get();
      if (configSnap.exists) {
        const data = configSnap.data();
        console.log(`✅ config/${orgId}:`);
        console.log(`   - Catégories: ${data.expenseCategories?.length || 0}`);
        console.log(`   - Vendors: ${data.vendors?.length || 0}`);
        console.log(`   - Migré le: ${data.migratedAt?.toDate?.() || 'N/A'}`);
      } else {
        console.log(`❌ config/${orgId}: MANQUANT`);
      }
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  }
}

// Exécution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'migrate';
  
  try {
    if (command === 'verify') {
      await verifyMigration();
    } else if (command === 'migrate') {
      await migrateConfigToOrgs();
    } else {
      console.log('Usage:');
      console.log('  node migrate-config-to-orgs.cjs migrate  # Migrer les données');
      console.log('  node migrate-config-to-orgs.cjs verify   # Vérifier la migration');
      process.exit(1);
    }
    
    console.log('\n✨ Terminé !');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Échec:', error.message);
    process.exit(1);
  }
}

main();
