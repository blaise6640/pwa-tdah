import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { getProperties } from "../../lib/properties";

export interface OrgMetrics {
  recouvrementGlobal: number;
  rendementBrut: number;
  rendementNet: number;
  ratioCharges: number;
  tauxOccupation: number;
  cashFlowNet: number;
}

export async function computeOrgMetrics(orgId: string, month?: string): Promise<OrgMetrics> {
  // Dates
  let start: Date, end: Date;
  if (month) {
    const [year, m] = month.split('-');
    start = new Date(Number(year), Number(m) - 1, 1, 0, 0, 0);
    end = new Date(Number(year), Number(m), 1, 0, 0, 0);
  } else {
    end = new Date();
    start = new Date(end.getFullYear() - 1, end.getMonth() + 1, 1, 0, 0, 0);
  }

  // Flows
  const q = query(
    collectionGroup(db, "scheduledFlows"),
    where("orgId", "==", orgId),
    where("dueDate", ">=", start),
    where("dueDate", "<", end),
    orderBy("dueDate", "asc")
  );
  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any[];
  const filtered = docs.filter(doc => doc.status !== 'void');

  let inExpected = 0, inPaid = 0, outExpected = 0, outPaid = 0;
  for (const doc of filtered) {
    const expected = Number(doc.amountExpected || 0) || 0;
    const paid = Number(doc.allocatedAmount || 0) || 0;
    if (doc.direction === 'in') {
      inExpected += expected;
      inPaid += paid;
    } else {
      outExpected += expected;
      outPaid += paid;
    }
  }

  // Properties
  const properties = await getProperties(orgId);
  const nbProperties = properties.length;
  const totalValue = properties.reduce((acc, p) => acc + (Number(p.estimatedValue) || 0), 0);

  // Leases (occupation)
  let nbLeases = 0;
  try {
    const leasesSnap = await getDocs(query(collectionGroup(db, "leases"), where("orgId", "==", orgId), where("status", "==", "active")));
    nbLeases = leasesSnap.size;
  } catch {
    nbLeases = 0;
  }

  // Calculs
  const recouvrementGlobal = inExpected > 0 ? inPaid / inExpected : 0;
  const cashFlowNet = inPaid - outPaid;
  const ratioCharges = inPaid > 0 ? outPaid / inPaid : 0;
  const rendementBrut = (totalValue > 0 && inExpected > 0) ? ((inExpected * 12) / totalValue) : 0;
  const rendementNet = (totalValue > 0 && inPaid > 0) ? (((inPaid - outPaid) * 12) / totalValue) : 0;
  const tauxOccupation = nbProperties > 0 ? nbLeases / nbProperties : 0;

  return {
    recouvrementGlobal,
    rendementBrut,
    rendementNet,
    ratioCharges,
    tauxOccupation,
    cashFlowNet,
  };
}
