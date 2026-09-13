/* CommonJS wrapper of freq-to-en migration script for environments with "type": "module" */
const admin = require('firebase-admin');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

function normalizeFrequency(value) {
  if (!value && value !== 0) return null;
  const v = String(value).toLowerCase();
  // Specific checks first
  if (v.includes('one-off') || v === 'oneoff' || v === 'once' || v === 'unique' || v === 'ponctuel' || v === 'ponctuelle') return 'one-off';
  if (v.includes('sem') || v.includes('semestr') || v === 'semiannual' || v === 'biannual' || v === 'semi-annuel' || v === 'semestriel' || v === 'semestrielle') return 'semiannual';
  if (v.includes('trimes') || v === 'quarterly' || v === 'quarter' || v === 'trim') return 'quarterly';
  if (v.includes('month') || v.includes('mens') || v === 'monthly' || v === 'mensuel' || v === 'mensuelle') return 'monthly';
  if (v.includes('ann') || v === 'annual' || v === 'year' || v === 'yearly' || v === 'annually' || v === 'annuel' || v === 'annuelle') return 'yearly';
  if (v === 'one-off' || v === 'oneoff' || v === 'once' || v === 'unique' || v === 'ponctuel' || v === 'ponctuelle') return 'one-off';
  const canon = ['one-off','monthly','quarterly','semiannual','yearly'];
  if (canon.includes(v)) return v;
  return null;
}

async function main() {
  const apply = !!argv.apply;
  console.log('Starting migration: freq-to-en');
  console.log('Mode:', apply ? 'APPLY changes' : 'DRY-RUN (no writes)');

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
