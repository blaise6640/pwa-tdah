import { db } from "../src/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import dayjs from "dayjs";
import { generateLeaseFlows } from "src/lib/leaseFlows";

export async function seedLeases(orgId: string, propertyId: string) {
  const leases = [
    {
      label: "Bail Société Dupont",
      tenant: "Société Dupont SA",
      startDate: dayjs("2025-08-15").toDate(), // commence en milieu de mois pour tester prorata
      endDate: dayjs("2026-07-31").toDate(),
      rent: 1000,
      provisionChargesPrivatives: 100,
      provisionChargesCommunes: 200,
      garantieLocative: 2000,
    },
  ];

  for (const lease of leases) {
    // Référence à un nouveau document Lease
    const leasesCol = collection(db, "orgs", orgId, "leases");
    const ref = doc(leasesCol);
    const leaseId = ref.id;

    const leaseDoc = {
      ...lease,
      id: leaseId,
      orgId,
      propertyId,
      createdAt: dayjs().toDate(),
      status: "active",
    };

    // Crée le bail
    await setDoc(ref, leaseDoc);

    console.log(`✅ Bail créé: ${lease.label} (${leaseId})`);

    // Génère automatiquement les flux du bail
    await generateLeaseFlows(orgId, leaseId, { preview: false });

    console.log(`   ↳ Flux générés pour ${lease.label}`);
  }
}
