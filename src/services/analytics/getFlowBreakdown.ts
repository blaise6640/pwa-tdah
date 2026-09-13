import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export interface FlowBreakdownRow {
  tag: string;
  direction: 'in' | 'out';
  expected: number;
  paid: number;
  remaining: number;
  share: number; // proportion dans le total 'in' ou 'out'
}

export async function getFlowBreakdown(orgId: string, month: string): Promise<{
  inbound: FlowBreakdownRow[];
  outbound: FlowBreakdownRow[];
}> {
  const [year, m] = month.split('-');
  const start = new Date(Number(year), Number(m) - 1, 1, 0, 0, 0);
  const end = new Date(Number(year), Number(m), 1, 0, 0, 0);

  const q = query(
    collectionGroup(db, "scheduledFlows"),
    where("orgId", "==", orgId),
    where("dueDate", ">=", start),
    where("dueDate", "<", end),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

  // Filtrer les void
  const filtered = docs.filter(doc => doc.status !== 'void');

  // Agrégation par tag et direction
  const buckets: Record<string, FlowBreakdownRow> = {};
  let totalIn = 0, totalOut = 0;
  for (const doc of filtered) {
    const direction = doc.direction === 'in' ? 'in' : 'out';
    const tag = (Array.isArray(doc.tags) && doc.tags[0]) ? doc.tags[0] : 'Autre';
    const key = direction + '|' + tag;
    if (!buckets[key]) {
      buckets[key] = {
        tag,
        direction,
        expected: 0,
        paid: 0,
        remaining: 0,
        share: 0,
      };
    }
    const expected = Number(doc.amountExpected || 0) || 0;
    const paid = Number(doc.allocatedAmount || 0) || 0;
    buckets[key].expected += expected;
    buckets[key].paid += paid;
    buckets[key].remaining += Math.max(0, expected - paid);
    if (direction === 'in') totalIn += paid;
    else totalOut += paid;
  }

  // Calcul des parts
  const inbound: FlowBreakdownRow[] = [];
  const outbound: FlowBreakdownRow[] = [];
  for (const row of Object.values(buckets)) {
    if (row.direction === 'in') {
      row.share = totalIn > 0 ? row.paid / totalIn : 0;
      inbound.push(row);
    } else {
      row.share = totalOut > 0 ? row.paid / totalOut : 0;
      outbound.push(row);
    }
  }
  // Tri par montant payé décroissant
  inbound.sort((a, b) => b.paid - a.paid);
  outbound.sort((a, b) => b.paid - a.paid);
  return { inbound, outbound };
}
