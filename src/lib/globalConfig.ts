import { Firestore, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as defaultDb } from '../firebase';
import { ExpenseCategory, Vendor } from '../components/ExpenseConfigEditor';

export interface GlobalConfig {
  id: string;
  categories: ExpenseCategory[];
  vendors?: Vendor[];
  updatedAt?: Date;
  updatedBy?: string | null;
}

/**
 * Récupère la configuration globale depuis config/global
 */
export async function getGlobalConfig(dbInstance: Firestore | null = null): Promise<GlobalConfig> {
  const db = dbInstance || defaultDb;
  const docRef = doc(db, 'config', 'global');
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return { id: 'global', categories: [], vendors: [] };
  }
  
  const data = snap.data();
  return {
    id: 'global',
    categories: Array.isArray(data.expenseCategories)
      ? data.expenseCategories.filter((c: any) => c.active !== false)
      : [],
    vendors: Array.isArray(data.vendors) ? data.vendors : [],
    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt,
    updatedBy: data.updatedBy || null,
  };
}

/**
 * Met à jour la configuration globale dans config/global
 */
export async function updateGlobalConfig(
  dbInstance: Firestore | null = null,
  data: Partial<GlobalConfig>,
  updatedBy?: string
): Promise<void> {
  const db = dbInstance || defaultDb;
  const docRef = doc(db, 'config', 'global');
  
  let toMerge: any = {};
  if (data.categories) {
    // Si les catégories sont déjà des objets ExpenseCategory, les utiliser directement
    if (data.categories.length > 0 && typeof data.categories[0] === 'object' && 'id' in data.categories[0]) {
      toMerge.expenseCategories = data.categories;
    } else {
      // Sinon, convertir les strings en objets ExpenseCategory
      toMerge.expenseCategories = (data.categories as unknown as string[]).map((id, i) => ({ 
        id, 
        label: id, 
        order: (i + 1) * 10, 
        active: true 
      }));
    }
  }
  if (data.vendors) {
    toMerge.vendors = data.vendors;
  }
  toMerge.updatedAt = serverTimestamp();
  toMerge.updatedBy = updatedBy || null;
  
  await setDoc(docRef, toMerge, { merge: true });
}
