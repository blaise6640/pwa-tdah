import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export function makeFlowKey(dueDate, tag) {
  // Normalize tag and use UTC date to avoid timezone differences between client and server
  const normTag = String(tag || '').toLowerCase().trim();
  return `${normTag}_${dayjs(dueDate).utc().format('YYYY-MM-DD')}`;
}

/**
 * Pure function that builds the flows array for a lease.
 * - Accepts a `lease` object (can include Firestore Timestamp fields)
 * - Returns an array of flow objects (dueDate is a JS Date)
 */
export function buildLeaseFlows(lease, options = {}) {
  // Keep options in signature for backward compatibility but ignore prorata behavior
  const opts = options || {};

  const start = dayjs(lease.startDate && typeof lease.startDate.toDate === 'function' ? lease.startDate.toDate() : lease.startDate);
  const end = lease.endDate ? dayjs(lease.endDate && typeof lease.endDate.toDate === 'function' ? lease.endDate.toDate() : lease.endDate) : start.add(1, 'year').subtract(1, 'day');

  const makeFlow = (opts) => ({
    direction: opts.direction,
    amountExpected: Math.round((opts.amountExpected + Number.EPSILON) * 100) / 100,
    dueDate: opts.dueDate.toDate ? opts.dueDate.toDate() : (opts.dueDate instanceof Date ? opts.dueDate : dayjs(opts.dueDate).toDate()),
    currency: 'EUR',
    status: 'scheduled',
    tags: opts.tags,
    parentType: 'lease',
    parentId: lease.id || lease.leaseId || null,
    createdAt: new Date(),
  });

  const flowsToCreate = [];

  // Garanties (dépot) - unchanged
  if (lease.depositAmount && lease.depositAmount > 0) {
    flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: lease.depositAmount, dueDate: start, tags: ['garantie', 'entrée'] }));
    flowsToCreate.push(makeFlow({ direction: 'out', amountExpected: lease.depositAmount, dueDate: end, tags: ['garantie', 'sortie'] }));
  }

  // Mensualités : générer un flux par mois, aligné sur le jour de début du bail
  // et sans prorata : chaque flux mensuel a le montant total (loyer + provisions) et
  // la date d'échéance correspond au jour du mois du start (ou au dernier jour du mois si ce jour n'existe pas).
  const paymentDay = start.date(); // numeric day of month (1..31)

  // Start iteration from the month of the lease start
  let cursor = start.startOf('month');
  while (true) {
    const year = cursor.year();
    const month = cursor.month();
    const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth();
    const day = Math.min(paymentDay, daysInMonth);
    const due = dayjs(new Date(year, month, day)).startOf('day');

    // stop when due is after end
    if (due.isAfter(end, 'day')) break;

    const baseRent = lease.rentAmount || 0;
    const basePrivate = lease.privateCharges || 0;
    const baseCommon = lease.commonCharges || 0;

    if (baseRent > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: baseRent, dueDate: due, tags: ['loyer'] }));
    if (basePrivate > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: basePrivate, dueDate: due, tags: ['charges_privatives'] }));
    if (baseCommon > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: baseCommon, dueDate: due, tags: ['charges_communes'] }));

    // advance cursor to next month
    cursor = cursor.add(1, 'month');
    if (cursor.year() > 2100) break;
  }

  return flowsToCreate;
}
