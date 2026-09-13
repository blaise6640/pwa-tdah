/*
Regenerate scheduledFlows for a specific expense using the admin SDK.

Usage (requires GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON):
  node scripts/migrate/regenerate-flows.cjs --orgId=222 --propertyId=glate-1759689118673 --expenseId=exp_... --dry
  node scripts/migrate/regenerate-flows.cjs --orgId=222 --propertyId=glate-1759689118673 --expenseId=exp_... --apply

--dry will only print what would be done.
*/

const admin = require('firebase-admin');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const dayjs = require('dayjs');
const isLeapYear = require('dayjs/plugin/isLeapYear');
dayjs.extend(isLeapYear);

function normalizeFrequencyLocal(input) {
  if (input === undefined || input === null) return null;
  const v = String(input).toLowerCase();
  if (v.includes('sem') || v.includes('semestr') || v === 'semiannual' || v === 'biannual') return 'semiannual';
  if (v.includes('trimes') || v === 'quarterly' || v === 'quarter') return 'quarterly';
  if (v.includes('month') || v.includes('mens') || v === 'monthly') return 'monthly';
  if (v.includes('ann') || v === 'annual' || v === 'yearly') return 'yearly';
  if (v === 'one-off' || v === 'oneoff' || v === 'once') return 'one-off';
  return null;
}

async function regenerate(orgId, propertyId, expenseId, options) {
  if (!admin.apps.length) admin.initializeApp();
  const db = admin.firestore();

  const expRef = db.collection('orgs').doc(orgId).collection('properties').doc(propertyId).collection('expenses').doc(expenseId);
  const expSnap = await expRef.get();
  if (!expSnap.exists) {
    throw new Error(`Expense not found: ${expRef.path}`);
  }
  const expense = expSnap.data();
  const freqSource = expense.frequencyRaw ?? expense.frequency;
  const freqNorm = normalizeFrequencyLocal(freqSource) ?? expense.frequency;
  const total = expense.amountEstimated ?? 0;

  // compute start month/year if present
  const startMonth = options.startMonth ?? (options.startMonth === 0 ? 0 : undefined);
  const startYear = options.startYear;
  const now = dayjs();
  const sMonth = (startMonth !== undefined) ? startMonth : now.month();
  const sYear = (startYear !== undefined) ? startYear : now.year();
  const baseDate = dayjs().startOf('year').year(sYear).add(sMonth, 'month');

  const flowsCol = expRef.collection('scheduledFlows');

  // list existing scheduled flows
  const existing = await flowsCol.get();
  const toDelete = [];
  existing.forEach(d => {
    const data = d.data();
    if (data.status === 'scheduled') toDelete.push(d.ref);
  });

  console.log(`Found ${toDelete.length} existing scheduled flows; will delete and recreate.`);

  // build new flows
  const flows = [];

  if (expense.isCapex === true && typeof expense.amortizationPeriodMonths === 'number' && expense.amortizationPeriodMonths > 0) {
    const n = expense.amortizationPeriodMonths;
    const perMonth = Math.round((total / n) * 100) / 100;
    let totalAllocated = 0;
    for (let i = 0; i < n; i++) {
      let amount = perMonth;
      if (i === n - 1) amount = Math.round((total - totalAllocated) * 100) / 100;
      flows.push({ amountExpected: amount, dueDate: baseDate.add(i, 'month').startOf('month').toDate() });
      totalAllocated += amount;
    }
  } else if (freqNorm === 'one-off') {
    flows.push({ amountExpected: total, dueDate: baseDate.startOf('month').toDate() });
  } else if (expense.smoothing === 'monthly') {
    let monthsCount = 12;
    if (freqNorm === 'quarterly') monthsCount = 3;
    else if (freqNorm === 'semiannual') monthsCount = 6;
    else if (freqNorm === 'yearly') monthsCount = 12;
    else if (freqNorm === 'monthly') monthsCount = 1;
    const perMonth = Math.round((total / monthsCount) * 100) / 100;
    let totalAllocated = 0;
    for (let i = 0; i < monthsCount; i++) {
      let amount = perMonth;
      if (i === monthsCount - 1) amount = Math.round((total - totalAllocated) * 100) / 100;
      flows.push({ amountExpected: amount, dueDate: baseDate.add(i, 'month').startOf('month').toDate() });
      totalAllocated += amount;
    }
  } else if (freqNorm === 'yearly') {
    if (expense.smoothing === 'monthly_prorata') {
      const year = baseDate.year();
      const isLeap = dayjs(`${year}-01-01`).isLeapYear();
      const daysInYear = isLeap ? 366 : 365;
      let totalAllocated = 0;
      for (let i = 0; i < 12; i++) {
        const monthDate = baseDate.startOf('year').add(i, 'month');
        const daysInMonth = monthDate.daysInMonth();
        let amount = (total * daysInMonth) / daysInYear;
        amount = Math.round(amount * 100) / 100;
        if (i === 11) amount = Math.round((total - totalAllocated) * 100) / 100;
        flows.push({ amountExpected: amount, dueDate: monthDate.startOf('month').toDate() });
        totalAllocated += amount;
      }
    } else {
      flows.push({ amountExpected: total, dueDate: baseDate.startOf('month').toDate() });
    }
  } else if (freqNorm === 'monthly') {
    for (let i = 0; i < 12; i++) {
      flows.push({ amountExpected: Math.round(total * 100) / 100, dueDate: baseDate.add(i, 'month').startOf('month').toDate() });
    }
  } else if (freqNorm === 'quarterly') {
    for (let i = 0; i < 4; i++) {
      flows.push({ amountExpected: Math.round((total / 4) * 100) / 100, dueDate: baseDate.add(i * 3, 'month').startOf('month').toDate() });
    }
  }

  console.log(`Will create ${flows.length} new flows for expense ${expRef.path}`);

  if (options.dry) return { toDelete: toDelete.map(d=>d.path), flows };

  // Perform deletions then writes
  for (const ref of toDelete) {
    await ref.delete();
  }
  for (const f of flows) {
    const d = f.dueDate;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
  const logicalId = `flow_${y}-${m}`;
  const { createFlowDocIdShort } = require('../../src/lib/flowIds');
  const customId = createFlowDocIdShort(logicalId);
    const payload = {
      amountExpected: f.amountExpected,
      dueDate: admin.firestore.Timestamp.fromDate(d),
      status: 'scheduled',
      direction: 'out',
      parentType: 'expense',
      parentId: expenseId,
      orgId,
      propertyId,
      id: customId,
      logicalId,
      label: expense.label ?? 'Flux expense',
      tags: expense.category ? [expense.category] : [],
      currency: 'EUR',
    };
    await flowsCol.doc(customId).set(payload);
  }

  return { deleted: toDelete.length, created: flows.length };
}

(async()=>{
  const orgId = argv.orgId;
  const propertyId = argv.propertyId;
  const expenseId = argv.expenseId;
  const dry = !!argv.dry && !argv.apply;
  const apply = !!argv.apply;
  if (!orgId || !propertyId || !expenseId) {
    console.error('Usage: --orgId --propertyId --expenseId [--dry] [--apply]');
    process.exit(1);
  }
  try {
    const res = await regenerate(orgId, propertyId, expenseId, { dry, apply });
    console.log('Result:', res);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
