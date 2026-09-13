/*
 Backfill script to populate amountRemaining on Payment documents.
 Usage:
   node scripts/backfill-amountRemaining.js --project <projectId> --dry-run
   node scripts/backfill-amountRemaining.js --project <projectId> --apply --service-account /path/to/key.json

 The script will iterate orgs and payments and for payments missing amountRemaining it will compute amount - sum(allocations) and update the document.
 It supports dry-run (no writes) and apply (perform writes). It can connect to the emulator via FIRESTORE_EMULATOR_HOST or use a service account.
*/

const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  const dryRun = argv['dry-run'] || argv['dryrun'] || !argv.apply;
  const apply = !!argv.apply;
  const projectId = argv.project || process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT;
  const serviceAccountPath = argv['service-account'] || argv.sa;

  if (!projectId && !process.env.FIRESTORE_EMULATOR_HOST) {
    console.error('Provide --project <projectId> or set FIRESTORE_EMULATOR_HOST to use the emulator.');
    process.exit(1);
  }

  let admin;
  try {
    admin = require('firebase-admin');
  } catch (err) {
    console.error('Please install firebase-admin in the repo: npm install firebase-admin');
    process.exit(1);
  }

  const opts = {};
  if (serviceAccountPath) {
    opts.credential = admin.credential.cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')));
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    opts.credential = admin.credential.applicationDefault();
  }

  if (projectId) opts.projectId = projectId;

  admin.initializeApp(opts);
  const db = admin.firestore();

  console.log('Connected to Firestore. dryRun=', dryRun, 'projectId=', projectId || '(emulator)');

  // We assume orgs are stored under /orgs/{orgId}
  const orgsSnap = await db.collection('orgs').get();
  console.log('Found', orgsSnap.size, 'orgs');

  let totalPayments = 0;
  let updatedCount = 0;
  for (const orgDoc of orgsSnap.docs) {
    const orgId = orgDoc.id;
    const paymentsRef = db.collection('orgs').doc(orgId).collection('payments');
    const paymentsSnap = await paymentsRef.get();
    console.log(`Org ${orgId}: ${paymentsSnap.size} payments`);
    totalPayments += paymentsSnap.size;
    for (const payDoc of paymentsSnap.docs) {
      const data = payDoc.data();
      if (data.amountRemaining !== undefined && data.amountRemaining !== null) continue;
      const paymentId = payDoc.id;
      const amount = Number(data.amount || 0);
      // Sum allocations
      const allocSnap = await paymentsRef.doc(paymentId).collection('allocations').get();
      let allocatedSum = 0;
      for (const a of allocSnap.docs) allocatedSum += Number(a.data().amount || 0);
      const computedRemaining = Number((amount - allocatedSum).toFixed(2));
      const newStatus = computedRemaining <= 0 ? 'allocated' : computedRemaining < amount ? 'partially_allocated' : 'open';
      console.log(`  payment ${paymentId}: amount=${amount}, allocated=${allocatedSum}, remaining=${computedRemaining}, status=${newStatus}`);
      if (!dryRun && apply) {
        await paymentsRef.doc(paymentId).update({ amountRemaining: computedRemaining, status: newStatus });
        updatedCount++;
      }
    }
  }

  console.log('Done. totalPayments=', totalPayments, 'updated=', updatedCount);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
