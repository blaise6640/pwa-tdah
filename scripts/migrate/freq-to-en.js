/*
Migration helper: remplace les valeurs de `frequency` et `frequencyRaw` francisées
par les clés canoniques EN (one-off, monthly, quarterly, semiannual, yearly).

Usage (sécurisé):
  # dry-run (inspect uniquement)
  node scripts/migrate/freq-to-en.js --dry

  # apply changes (nécessite variable d'environnement GOOGLE_APPLICATION_CREDENTIALS
  # pointant sur une clé de service avec droits Firestore)
  node scripts/migrate/freq-to-en.js --apply

Remarques:
 - Le script parcourt tous les documents `orgs/{orgId}/properties/{propId}/expenses/{expenseId}`.
 - Il met à jour `frequency` et `frequencyRaw` si nécessaire.
 - Toujours tester en dry-run d'abord.
*/

const admin = require('firebase-admin');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

function normalizeFrequency(value) {
  if (!value && value !== 0) return null;
  const v = String(value).toLowerCase();
  if (v.includes('ann') || v === 'annual' || v === 'year' || v === 'yearly' || v === 'annuel' || v === 'annuelle') return 'yearly';
  if (v.includes('month') || v.includes('mens') || v === 'monthly' || v === 'mensuel' || v === 'mensuelle') return 'monthly';
  if (v.includes('trimes') || v === 'quarterly' || v === 'quarter' || v === 'trim') return 'quarterly';
  if (v.includes('sem') || v === 'semiannual' || v === 'biannual' || v === 'semi-annuel' || v === 'semestriel' || v === 'semestrielle') return 'semiannual';
  if (v === 'one-off' || v === 'oneoff' || v === 'once' || v === 'unique' || v === 'ponctuel' || v === 'ponctuelle' || v === 'ponctuelle') return 'one-off';
  // fallback: if already canonical, keep
  const canon = ['one-off','monthly','quarterly','semiannual','yearly'];
  if (canon.includes(v)) return v;
  return null;
}

async function main() {
  const apply = !!argv.apply;
  console.log('Starting migration: freq-to-en');
  console.log('Mode:', apply ? 'APPLY changes' : 'DRY-RUN (no writes)');

  // init admin
  if (!admin.apps.length) {
    try {
      admin.initializeApp({});
    } catch (e) {
      console.error('Failed to initialize firebase-admin. Ensure GOOGLE_APPLICATION_CREDENTIALS is set.', e.message);
      process.exit(1);
    }
  }

  const db = admin.firestore();
  const orgsSnap = await db.collection('orgs').get();
  console.log(`Found ${orgsSnap.size} orgs`);

  let totalChecked = 0;
  let totalUpdated = 0;

  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const propsSnap = await db.collection('orgs').doc(orgId).collection('properties').get();
    for (const propDoc of propsSnap.docs) {
      const propId = propDoc.id;
      const expensesRef = db.collection('orgs').doc(orgId).collection('properties').doc(propId).collection('expenses');
      const expensesSnap = await expensesRef.get();
      for (const expDoc of expensesSnap.docs) {
        totalChecked++;
        const data = expDoc.data();
        const oldFreq = data.frequency;
        const oldFreqRaw = data.frequencyRaw;
        const normFromRaw = normalizeFrequency(oldFreqRaw ?? oldFreq);
        // If we couldn't recognize, skip
        if (!normFromRaw) continue;
        const newFrequency = normFromRaw;
        const newFrequencyRaw = oldFreqRaw ?? oldFreq ?? newFrequency;

        const needsUpdate = (oldFreq !== newFrequency) || (oldFreqRaw !== newFrequencyRaw);
        if (needsUpdate) {
          console.log(`Will update ${expDoc.ref.path}: frequency='${oldFreq}' -> '${newFrequency}', frequencyRaw='${oldFreqRaw}' -> '${newFrequencyRaw}'`);
          if (apply) {
            await expDoc.ref.update({ frequency: newFrequency, frequencyRaw: newFrequencyRaw });
            totalUpdated++;
          }
        }
      }
    }
  }

  console.log(`Checked ${totalChecked} expenses, updated ${totalUpdated}.`);
  console.log('Done.');
}

main().catch(err=>{console.error(err);process.exit(1);});
