import type { ScheduledFlow } from '../../types/flows';

// Fallback minimal type in case ScheduledFlow doesn't include optional fields used here
type MinimalFlow = ScheduledFlow & {
  allocatedAmount?: number;
  amountExpected?: number;
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

export function principalPaidSoFar(flows: MinimalFlow[]): number {
  const relevant = (flows || []).filter((f) => f && f.tags && f.tags.includes('principal') && (f.status === 'partially_paid' || f.status === 'paid'));

  const totalPrincipalPaid = relevant.reduce((acc, flow) => {
    const amount = typeof flow.amountExpected === 'number' ? flow.amountExpected : 0;
    const allocated = typeof flow.allocatedAmount === 'number' ? flow.allocatedAmount : 0;
    const paidFrac = clamp(allocated / Math.max(1, amount), 0, 1);
    const principalPaid = amount * paidFrac;
    return acc + principalPaid;
  }, 0);

  return round2(totalPrincipalPaid);
}

export function computeOutstandingPrincipal(initialAmount: number, flows: MinimalFlow[]): number {
  const paid = principalPaidSoFar(flows || []);
  const outstanding = Math.max(0, round2((initialAmount || 0) - paid));
  return outstanding;
}

export default { computeOutstandingPrincipal, principalPaidSoFar };
