import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

export type MonthlySummaryRow = {
  month: string; // 'YYYY-MM'
  inExpected: number;
  outExpected: number;
  inPaid: number;
  outPaid: number;
  inRemaining: number;
  outRemaining: number;
  inOverdue: number;
  outOverdue: number;
  recouvrement: number;
  // Ajouts
  cashNet: number; // inExpected - outExpected
  sansCapital: number; // inExpected - (outExpected - principalExpectedOut)
};

function monthKeyFromTimestamp(ts: { seconds?: number; toDate?: () => Date } | any): string {
  let d: Date;
  if (!ts) return "1970-01";
  if (typeof ts.toDate === "function") d = ts.toDate();
  else if (ts.seconds) d = new Date(ts.seconds * 1000);
  else d = new Date(ts);
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}

export async function getMonthlySummary(
  orgId: string,
  year: number,
  opts?: { includeVoided?: boolean; propertyId?: string }
): Promise<MonthlySummaryRow[]> {
  // build 12 buckets
  const buckets: Record<string, MonthlySummaryRow> = {};
  for (let m = 1; m <= 12; m++) {
    const mm = m.toString().padStart(2, "0");
    const key = `${year}-${mm}`;
    buckets[key] = {
      month: key,
      inExpected: 0,
      outExpected: 0,
      inPaid: 0,
      outPaid: 0,
      inRemaining: 0,
      outRemaining: 0,
      inOverdue: 0,
      outOverdue: 0,
      recouvrement: 0,
      cashNet: 0,
      sansCapital: 0,
    };
  }

  // Query single call
  const start = new Date(year, 0, 1, 0, 0, 0);
  const end = new Date(year + 1, 0, 1, 0, 0, 0);

  let q = query(
    collectionGroup(db, "scheduledFlows"),
    where("orgId", "==", orgId),
    where("dueDate", ">=", start),
    where("dueDate", "<", end),
    orderBy("dueDate", "asc")
  );

  // If a propertyId filter is provided, add an equality filter. Firestore supports
  // equality filters together with range filters on another field.
  if (opts?.propertyId) {
    q = query(q, where("propertyId", "==", opts.propertyId));
  }

  if (!opts?.includeVoided) {
    q = query(q, where("status", "!=", "void"));
    // Note: Firestore doesn't allow != with range on same field in some combinations,
    // but collectionGroup + range on dueDate + equality on orgId should be fine. If not,
    // fallback to client-side filter below.
  }

  const snap = await getDocs(q).catch(async (err) => {
    // If server rejects the != query combination, fallback to broader query and filter client-side
    if (String(err).includes("is not supported")) {
      const q2 = query(
        collectionGroup(db, "scheduledFlows"),
        where("orgId", "==", orgId),
        where("dueDate", ">=", start),
        where("dueDate", "<", end),
        orderBy("dueDate", "asc")
      );
      return await getDocs(q2);
    }
    throw err;
  });

  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];

  // Suivi des montants attendus de capital (principal) pour les décaissements
  const principalExpectedOutByMonth: Record<string, number> = {};
  const principalDocIds: Record<string, boolean> = {};

  // Pré-classement des flux de prêts pour distinguer capital vs intérêt par mois/loan
  try {
    // Regrouper par (mois, loanId|parentId)
    const groups: Record<string, any[]> = {};
    for (const doc of docs) {
      const direction = String(doc?.direction || '').toLowerCase();
      const parentType = String(doc?.parentType || '').toLowerCase();
      const hasLoanLink = parentType === 'loan' || !!doc?.loanId;
      if (direction !== 'out' || !hasLoanLink) continue;
      const month = monthKeyFromTimestamp(doc.dueDate);
      const loanKey = String(doc.loanId || doc.parentId || '');
      const key = `${month}|${loanKey}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }

    for (const key of Object.keys(groups)) {
      const arr = groups[key];
      // 1) Marquer ceux explicitement principal via tags/groupId
      const explicitPrincipal = arr.filter((doc) => {
        const tags: string[] = Array.isArray(doc.tags) ? doc.tags.map((t: any) => String(t || '').toLowerCase()) : [];
        const groupId = String(doc.groupId || '').toLowerCase();
        const looksPrincipal = tags.includes('principal') || tags.includes('capital') || groupId.includes('amort');
        const looksInterest = tags.includes('interest') || groupId.includes('interest');
        return looksPrincipal && !looksInterest;
      });
      if (explicitPrincipal.length > 0) {
        for (const d of explicitPrincipal) principalDocIds[d.id] = true;
        continue;
      }
      // 2) Sinon, choisir le montant attendu le plus élevé comme principal (heuristique)
      let best: any | null = null;
      for (const d of arr) {
        if (!best || Number(d.amountExpected || 0) > Number(best.amountExpected || 0)) best = d;
      }
      if (best) principalDocIds[best.id] = true;
    }
  } catch {
    // En cas d'erreur, on tombera sur l'heuristique simple plus bas
  }

  for (const doc of docs) {
  const status: string = doc?.status || "";
    if (!opts?.includeVoided && status === "void") continue; // client-side safety

    const month = monthKeyFromTimestamp(doc.dueDate);
    if (!buckets[month]) continue; // out of requested year

    const expected = Number(doc.amountExpected || 0) || 0;
    const allocated = Number(doc.allocatedAmount || 0) || 0;
    const paid = Math.max(0, Math.min(allocated, expected));
    const remaining = Math.max(0, expected - paid);

  const isIn = doc.direction === "in";

    const row = buckets[month];
    if (isIn) {
      row.inExpected += expected;
      row.inPaid += paid;
      row.inRemaining += remaining;
      if (status === "overdue") row.inOverdue += remaining;
    } else {
      row.outExpected += expected;
      row.outPaid += paid;
      row.outRemaining += remaining;
      if (status === "overdue") row.outOverdue += remaining;

      // Ajouter au capital si ce doc est identifié comme principal
      if (principalDocIds[doc.id]) {
        principalExpectedOutByMonth[month] = (principalExpectedOutByMonth[month] || 0) + expected;
      }
    }
  }

  // finalize recouvrement
  const result = Object.values(buckets).map((r) => {
    const rec = r.inExpected > 0 ? r.inPaid / r.inExpected : 0;
    const principalOut = principalExpectedOutByMonth[r.month] || 0;
    const cashNet = (r.inExpected || 0) - (r.outExpected || 0);
    const sansCapital = (r.inExpected || 0) - ((r.outExpected || 0) - principalOut);
    return { ...r, recouvrement: Number(rec), cashNet, sansCapital };
  });

  // sort by month asc
  result.sort((a, b) => (a.month < b.month ? -1 : 1));
  return result;
}

export function sumAnnual(rows: MonthlySummaryRow[]) {
  const agg = {
    inExpected: 0,
    outExpected: 0,
    inPaid: 0,
    outPaid: 0,
    inRemaining: 0,
    outRemaining: 0,
    inOverdue: 0,
    outOverdue: 0,
    recouvrement: 0,
    cashNet: 0,
    sansCapital: 0,
  } as any;

  for (const r of rows) {
    agg.inExpected += r.inExpected;
    agg.outExpected += r.outExpected;
    agg.inPaid += r.inPaid;
    agg.outPaid += r.outPaid;
    agg.inRemaining += r.inRemaining;
    agg.outRemaining += r.outRemaining;
    agg.inOverdue += r.inOverdue;
    agg.outOverdue += r.outOverdue;
    agg.cashNet += r.cashNet || 0;
    agg.sansCapital += r.sansCapital || 0;
  }

  agg.recouvrement = agg.inExpected > 0 ? agg.inPaid / agg.inExpected : 0;

  return agg as {
    inExpected: number;
    outExpected: number;
    inPaid: number;
    outPaid: number;
    inRemaining: number;
    outRemaining: number;
    inOverdue: number;
    outOverdue: number;
    recouvrement: number;
    cashNet: number;
    sansCapital: number;
  };
}
