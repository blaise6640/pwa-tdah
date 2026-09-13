import { getDbInstance } from '../firebase';
import type { Property, PropertyInput } from '../types/property';

/**
 * Remove undefined values from an object
 * - Recursively cleans objects and arrays
 * - Dates are not affected
 */


function isPlainObject(v: any) {
  if (v === null || typeof v !== 'object') return false;
  return Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null;
}

function cleanUndefined<T extends Record<string, any>>(obj: T): T {
  if (obj == null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => (item === undefined ? null : cleanUndefined(item))) as any;
  }

  const out: any = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue; // skip undefined
    // Only recursively clean plain objects (POJOs). Preserve other objects (Dates, Firestore FieldValue sentinels, etc.) as-is.
    if (v && typeof v === 'object' && isPlainObject(v)) {
      out[k] = cleanUndefined(v);
    } else {
      out[k] = v;
    }
  }

  return out;
}

/**
 * Crée une propriété sous une organisation et retourne le nouvel ID de document (déterministe basé sur le nom)
 */
export async function createProperty(orgId: string, data: PropertyInput): Promise<string> {
  const db = await getDbInstance();
  const { collection, doc, setDoc } = await import('firebase/firestore');
  const colRef = collection(db, "orgs", orgId, "properties");
  // Générer un ID basé sur le nom (slug)
  const slugify = (str: string) => str
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 40);
  const base = data.name ? slugify(data.name) : 'property';
  let customId = base;
  // Pour éviter les collisions, ajoute un timestamp si besoin
  customId += '-' + Date.now();
  const docRef = doc(colRef, customId);
  const payload = {
    ...data,
    createdAt: (await import('firebase/firestore')).serverTimestamp(),
  };
  const cleaned = cleanUndefined(payload);
  await setDoc(docRef, cleaned);
  return customId;
}

/**
 * Get all properties for an organization
 */
export async function getProperties(orgId: string): Promise<Property[]> {
  const db = await getDbInstance();
  const { collection, query, orderBy, getDocs } = await import('firebase/firestore');
  const colRef = collection(db, 'orgs', orgId, 'properties');
  // Try to order by createdAt desc - if createdAt missing for some docs, fallback handled in consumer
  const q = query(colRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Property & { id: string }));
}

/**
 * Get a single property document by id
 */
export async function getProperty(orgId: string, propertyId: string): Promise<Property | null> {
  const db = await getDbInstance();
  const { doc, getDoc } = await import('firebase/firestore');
  const docRef = doc(db, 'orgs', orgId, 'properties', propertyId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() as Property;
}

/**
 * Delete a property document. Note: does not recursively delete subcollections (to implement later).
 */
export async function deleteProperty(orgId: string, propertyId: string): Promise<void> {
  const db = await getDbInstance();
  const { doc, deleteDoc } = await import('firebase/firestore');
  const docRef = doc(db, 'orgs', orgId, 'properties', propertyId);
  await deleteDoc(docRef);
}

export default {
  createProperty,
  getProperties,
  deleteProperty
};
