import { distributeDeltaAcrossFlows } from '../src/services/regularization';

type MockFlow = {
  id: string;
  amountExpected: number;
  dueDate: Date;
  status: 'scheduled' | 'paid' | 'partially_paid' | 'overdue' | 'void';
};

function makeFlows(n: number, amountEach: number, startYear = 2025): MockFlow[] {
  return Array.from({ length: n }).map((_, i) => ({
    id: `f${i + 1}`,
    amountExpected: amountEach,
    dueDate: new Date(startYear, i, 1),
    status: 'scheduled'
  }));
}

function toScheduledFlow(m: MockFlow) {
  return {
    id: m.id,
    orgId: 'org',
    propertyId: 'prop',
    parentType: 'expense',
    parentId: 'exp',
    amountExpected: m.amountExpected,
    allocatedAmount: 0,
    remainingAmount: m.amountExpected,
    dueDate: m.dueDate,
    status: m.status,
    direction: 'out',
    label: 'f',
    tags: [],
    currency: 'EUR',
    createdAt: new Date()
  } as any;
}

function printRows(rows: any[]) {
  if (!rows || rows.length === 0) {
    console.log('Aucun ajustement nécessaire');
    return;
  }
  for (const r of rows) {
    console.log(r.monthLabel, r.initialAmount, r.adjustment, r.newAmount, r.strategy);
  }
}

// Test 1: 12x100 => sumForecast=1200, amountReal=1212 => delta=+12 => +1 each
console.log('\nTest 1: payment 1212 (expect +1 per month)');
const flows1 = makeFlows(12, 100);
const rows1 = distributeDeltaAcrossFlows(1212 - 1200, flows1.map(toScheduledFlow));
printRows(rows1);

// Test 2: payment 1200 => delta 0
console.log('\nTest 2: payment 1200 (expect none)');
const rows2 = distributeDeltaAcrossFlows(1200 - 1200, flows1.map(toScheduledFlow));
printRows(rows2);

// Test 3: payment 1000 => delta -200 => per month approx -16.66.. -> -16.67/first months
console.log('\nTest 3: payment 1000 (expect -16.67 approx per month)');
const rows3 = distributeDeltaAcrossFlows(1000 - 1200, flows1.map(toScheduledFlow));
printRows(rows3);
