const dayjs = require('dayjs');
const isLeapYear = require('dayjs/plugin/isLeapYear');
dayjs.extend(isLeapYear);

function normalizeFrequency(v) {
  if (!v && v !== 0) return null;
  const s = String(v).toLowerCase();
  if (s.includes('sem') || s.includes('semestr') || s === 'semiannual' || s === 'biannual') return 'semiannual';
  if (s.includes('trimes') || s === 'quarterly' || s === 'quarter') return 'quarterly';
  if (s.includes('month') || s.includes('mens') || s === 'monthly') return 'monthly';
  if (s.includes('ann') || s === 'annual' || s === 'yearly') return 'yearly';
  if (s === 'one-off' || s === 'oneoff' || s === 'once') return 'one-off';
  return null;
}

function generateFlowsFor(expense, options) {
  const flows = [];
  const freq = expense.frequency;
  const freqNorm = normalizeFrequency(freq) ?? freq;
  const total = expense.amountEstimated ?? 0;
  const now = dayjs();
  const startMonth = (options && options.startMonth !== undefined) ? options.startMonth : now.month();
  const startYear = (options && options.startYear !== undefined) ? options.startYear : now.year();
  const baseDate = dayjs().startOf('year').year(startYear).add(startMonth, 'month');

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
    return flows;
  }

  if (freqNorm === 'one-off') {
    flows.push({ amountExpected: total, dueDate: baseDate.startOf('month').toDate() });
    return flows;
  }

  if (expense.smoothing === 'monthly') {
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
    return flows;
  }

  if (freqNorm === 'yearly') {
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
      return flows;
    }
    flows.push({ amountExpected: total, dueDate: baseDate.startOf('month').toDate() });
    return flows;
  }

  if (freqNorm === 'monthly') {
    for (let i = 0; i < 12; i++) {
      flows.push({ amountExpected: Math.round(total * 100) / 100, dueDate: baseDate.add(i, 'month').startOf('month').toDate() });
    }
    return flows;
  }

  if (freqNorm === 'quarterly') {
    for (let i = 0; i < 4; i++) {
      flows.push({ amountExpected: Math.round((total / 4) * 100) / 100, dueDate: baseDate.add(i * 3, 'month').startOf('month').toDate() });
    }
    return flows;
  }

  return flows;
}

// Test case: semestrielle + smoothing monthly
const expense = {
  frequency: 'semestrielle',
  smoothing: 'monthly',
  amountEstimated: 1200,
  isCapex: false,
};

const flows = generateFlowsFor(expense, { startMonth: 0, startYear: 2025 }); // Jan = 0
console.log('Generated flows:', flows.length);
flows.forEach(f => console.log(f.dueDate.toISOString().slice(0,10), f.amountExpected));
