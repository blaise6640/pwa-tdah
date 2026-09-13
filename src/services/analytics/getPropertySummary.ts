import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { getProperties } from "../../lib/properties";

export type PropertySummaryRow = {
  propertyId: string;
  propertyName: string;
  inExpected: number;
  outExpected: number;
  inPaid: number;
  outPaid: number;
  inRemaining: number;
  outRemaining: number;
  inOverdue: number;
  outOverdue: number;
  recouvrement: number;
  net: number;
};

/**
 * Agrège les flux et paiements par propriété pour un mois donné.
 * @param orgId Organisation
 * @param month "YYYY-MM"
 */
export async function getPropertySummary(orgId: string, month: string): Promise<PropertySummaryRow[]> {
  // Récupère toutes les propriétés de l'org
  const properties = await getProperties(orgId);
  const propertyMap = Object.fromEntries(properties.map((p: any) => [p.id, p]));

  // Récupère tous les scheduledFlows du mois
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

  // Agrégation par propriété
  const buckets: Record<string, PropertySummaryRow> = {};
  for (const doc of docs) {
    const propertyId = doc.propertyId || doc.flowPropertyId || "unknown";
    if (!buckets[propertyId]) {
      buckets[propertyId] = {
        propertyId,
        propertyName: propertyMap[propertyId]?.name || propertyId,
        inExpected: 0,
        outExpected: 0,
        inPaid: 0,
        outPaid: 0,
        inRemaining: 0,
        outRemaining: 0,
        inOverdue: 0,
        outOverdue: 0,
        recouvrement: 0,
        net: 0,
      };
    }
    const status: string = doc?.status || "";
    const expected = Number(doc.amountExpected || 0) || 0;
    const allocated = Number(doc.allocatedAmount || 0) || 0;
    const paid = Math.max(0, Math.min(allocated, expected));
    const remaining = Math.max(0, expected - paid);
    const isIn = doc.direction === "in";
    const row = buckets[propertyId];
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
    }
  }
  // Calcule le taux de recouvrement et le net
  for (const row of Object.values(buckets)) {
    row.recouvrement = row.inExpected > 0 ? row.inPaid / row.inExpected : 0;
    row.net = row.inPaid - row.outPaid;
  }
  // Trie par nom de propriété
  return Object.values(buckets).sort((a, b) => a.propertyName.localeCompare(b.propertyName));
}
