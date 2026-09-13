import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore);

export function makeFlowKey(dueDate, tag) {
  const normTag = String(tag || '').toLowerCase().trim();
  return `${normTag}_${dayjs(dueDate).utc().format('YYYY-MM-DD')}`;
}

export function buildLeaseFlows(lease, options = {}) {
  const { prorataFirstMonth = true, prorataLastMonth = false } = options;

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

  if (lease.depositAmount && lease.depositAmount > 0) {
    flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: lease.depositAmount, dueDate: start, tags: ['garantie', 'entrée'] }));
    flowsToCreate.push(makeFlow({ direction: 'out', amountExpected: lease.depositAmount, dueDate: end, tags: ['garantie', 'sortie'] }));
  }

  let cursor = start.startOf('month');
  while (cursor.isSameOrBefore(end, 'day')) {
    const firstOfMonth = cursor.startOf('month');
    const daysInMonth = firstOfMonth.daysInMonth();

    const monthStart = firstOfMonth.startOf('day');
    const monthEnd = firstOfMonth.endOf('month');

    const leaseStart = start.startOf('day');
    const leaseEnd = lease.endDate ? dayjs(lease.endDate && typeof lease.endDate.toDate === 'function' ? lease.endDate.toDate() : lease.endDate).endOf('day') : end.endOf('day');

    const occupiedStart = leaseStart.isAfter(monthStart) ? leaseStart : monthStart;
    const occupiedEnd = leaseEnd.isBefore(monthEnd) ? leaseEnd : monthEnd;

    if (occupiedStart.isAfter(occupiedEnd)) {
      cursor = cursor.add(1, 'month');
      continue;
    }

    const occupiedDays = occupiedEnd.date() - occupiedStart.date() + 1;

    const isFirstMonth = firstOfMonth.isSame(start.startOf('month'));
    const isLastMonth = lease.endDate ? firstOfMonth.isSame(dayjs(lease.endDate && typeof lease.endDate.toDate === 'function' ? lease.endDate.toDate() : lease.endDate).startOf('month')) : false;

    const shouldProrate = (occupiedDays < daysInMonth) && ((isFirstMonth && prorataFirstMonth) || (isLastMonth && prorataLastMonth) || (isFirstMonth && isLastMonth && (prorataFirstMonth || prorataLastMonth)));

    const baseRent = lease.rentAmount || 0;
    const basePrivate = lease.privateCharges || 0;
    const baseCommon = lease.commonCharges || 0;

    let rentAmount = baseRent;
    let privateCharges = basePrivate;
    let commonCharges = baseCommon;

    if (shouldProrate) {
      const factor = occupiedDays / daysInMonth;
      rentAmount = Math.round((baseRent * factor + Number.EPSILON) * 100) / 100;
      privateCharges = Math.round((basePrivate * factor + Number.EPSILON) * 100) / 100;
      commonCharges = Math.round((baseCommon * factor + Number.EPSILON) * 100) / 100;
    }

    if (rentAmount > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: rentAmount, dueDate: firstOfMonth, tags: ['loyer'] }));
    if (privateCharges > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: privateCharges, dueDate: firstOfMonth, tags: ['charges_privatives'] }));
    if (commonCharges > 0) flowsToCreate.push(makeFlow({ direction: 'in', amountExpected: commonCharges, dueDate: firstOfMonth, tags: ['charges_communes'] }));

    cursor = cursor.add(1, 'month');
    if (cursor.year() > 2100) break;
  }

  return flowsToCreate;
}
