import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Timestamp } from 'firebase/firestore';

// Rôles de locataires en français
export type TenantRole = 'principal' | 'locataire' | 'garant' | 'co-locataire';

export interface TenantContact {
  // Nouveau : prénom / nom séparés
  firstName?: string;
  lastName?: string;
  // Adresse structurée (même forme que pour les propriétés)
  address?: {
    line1?: string;
    line2?: string;
    postalCode?: string;
    city?: string;
    country?: string;
  };
  // Pour compatibilité on garde name (ancienne clé) — peut être générée à la lecture
  name?: string;
  email?: string;
  phone?: string;
  iban?: string;
}

export interface Tenant {
  id: string;
  counterpartyId?: string;
  role: TenantRole;
  startDate?: Timestamp;
  endDate?: Timestamp;
  share?: number;
  contact: TenantContact;
}

export type TenantInput = Omit<Tenant, 'id'>;

const tenantsCol = (orgId: string, leaseId: string) => collection(db, 'orgs', orgId, 'leases', leaseId, 'tenants');

// Utility: remove keys with undefined values (recursively) to avoid Firestore errors
export function cleanUndefined<T>(obj: T): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((v) => cleanUndefined(v));
  if (typeof obj === 'object') {
    const out: any = {};
    Object.entries(obj as any).forEach(([k, v]) => {
      if (v === undefined) return; // drop undefined
      if (v === null) {
        out[k] = null;
        return;
      }
      if (typeof v === 'object') {
        const cleaned = cleanUndefined(v);
        // only set if not an empty object
        if (cleaned !== undefined && (typeof cleaned !== 'object' || Object.keys(cleaned).length > 0)) {
          out[k] = cleaned;
        }
      } else {
        out[k] = v;
      }
    });
    return out;
  }
  return obj;
}

export async function addTenant(orgId: string, leaseId: string, tenant: TenantInput): Promise<string> {
  const col = tenantsCol(orgId, leaseId);
  const payload = cleanUndefined(tenant) as any;
  const ref = await addDoc(col, payload);
  return ref.id;
}

export async function updateTenant(orgId: string, leaseId: string, tenantId: string, updates: Partial<TenantInput>): Promise<void> {
  const ref = doc(db, 'orgs', orgId, 'leases', leaseId, 'tenants', tenantId);
  const payload = cleanUndefined(updates as any);
  // if nothing to update after cleaning, skip
  if (!payload || (typeof payload === 'object' && Object.keys(payload).length === 0)) return;
  await updateDoc(ref, payload as any);
}

export async function deleteTenant(orgId: string, leaseId: string, tenantId: string): Promise<void> {
  const ref = doc(db, 'orgs', orgId, 'leases', leaseId, 'tenants', tenantId);
  await deleteDoc(ref);
}

export async function getTenants(orgId: string, leaseId: string): Promise<Tenant[]> {
  const col = tenantsCol(orgId, leaseId);
  const q = query(col, orderBy('role'));
  const snap = await getDocs(q);
  const res: Tenant[] = [];
  snap.forEach((d) => {
    const data = d.data() as any;
    // compat: si contact.name absent, composer depuis firstName/lastName
    if (data?.contact && !data.contact.name) {
      const fn = data.contact.firstName || '';
      const ln = data.contact.lastName || '';
      const full = `${fn}${fn && ln ? ' ' : ''}${ln}`.trim();
      if (full) data.contact.name = full;
    }
    res.push({ id: d.id, ...(data as Omit<Tenant, 'id'>) });
  });
  return res;
}
