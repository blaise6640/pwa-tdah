import { doc, getDoc, setDoc, serverTimestamp, Firestore } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ExpenseCategory, Vendor } from '../components/ExpenseConfigEditor';

export interface OrgExpenseConfig {
  id: string; // "expenses"
  categories: ExpenseCategory[];
  vendors?: Vendor[];
  updatedAt?: Date;
  updatedBy?: string | null;
}

/**
 * Récupère la configuration des dépenses pour une organisation spécifique.
 * @param dbInstance - Instance Firestore (optionnel, utilise db par défaut)
 * @param orgId - Identifiant de l'organisation (obligatoire)
 * @returns Configuration des dépenses de l'organisation
 */
export async function getExpenseConfig(dbInstance: Firestore | null = null, orgId: string): Promise<OrgExpenseConfig> {
  if (!orgId) {
    throw new Error('orgId is required for getExpenseConfig');
  }
  
  const firestoreDb = dbInstance || db;
  const ref = doc(firestoreDb, 'config', orgId);
  const snap = await getDoc(ref);
  
  if (!snap.exists()) {
    return { id: 'expenses', categories: [], vendors: [] };
  }
  
  const data = snap.data() as any;
  const cfg: OrgExpenseConfig = {
    id: 'expenses',
    categories: Array.isArray(data.expenseCategories)
      ? data.expenseCategories.filter((c:any) => c.active !== false)
      : [],
    vendors: Array.isArray(data.vendors) ? data.vendors : undefined,
    updatedAt: data.updatedAt && typeof data.updatedAt.toDate === 'function' ? data.updatedAt.toDate() : data.updatedAt,
    updatedBy: data.updatedBy || null,
  };
  return cfg;
}

/**
 * Met à jour la configuration des dépenses pour une organisation spécifique.
 * @param dbInstance - Instance Firestore (optionnel, utilise db par défaut)
 * @param orgId - Identifiant de l'organisation (obligatoire)
 * @param data - Données partielles à mettre à jour
 * @param updatedBy - UID de l'utilisateur qui effectue la modification (optionnel)
 */
export async function updateExpenseConfig(dbInstance: Firestore | null = null, orgId: string, data: Partial<OrgExpenseConfig>, updatedBy?: string): Promise<void> {
  if (!orgId) {
    throw new Error('orgId is required for updateExpenseConfig');
  }
  
  const firestoreDb = dbInstance || db;
  const ref = doc(firestoreDb, 'config', orgId);
  const uid = updatedBy || (auth && auth.currentUser ? auth.currentUser.uid : null);
  
  // On merge dans expenseCategories
  let toMerge: any = {};
  if (data.categories) {
    // Si les catégories sont déjà des objets ExpenseCategory, les utiliser directement
    if (data.categories.length > 0 && typeof data.categories[0] === 'object' && 'id' in data.categories[0]) {
      toMerge.expenseCategories = data.categories;
    } else {
      // Sinon, convertir les strings en objets ExpenseCategory
      toMerge.expenseCategories = (data.categories as unknown as string[]).map((id, i) => ({ id, label: id, order: (i+1)*10, active: true }));
    }
  }
  if (data.vendors) {
    toMerge.vendors = data.vendors;
  }
  toMerge.updatedAt = serverTimestamp();
  toMerge.updatedBy = uid || null;
  
  await setDoc(ref, toMerge, { merge: true });
}

/**
 * Initialise la configuration d'une nouvelle organisation en copiant config/global
 * Copie uniquement expenseCategories et vendors (les fréquences et modes sont hardcodés)
 * @param dbInstance - Instance Firestore (optionnel, utilise db par défaut)
 * @param orgId - ID de l'organisation à initialiser
 * @param createdBy - Email/UID de l'utilisateur créateur (optionnel)
 */
export async function initializeOrgConfig(
  dbInstance: Firestore | null = null,
  orgId: string,
  createdBy?: string
): Promise<void> {
  if (!orgId) {
    throw new Error('orgId is required for initializeOrgConfig');
  }

  const firestoreDb = dbInstance || db;
  
  try {
    // Lire la config globale
    const globalRef = doc(firestoreDb, 'config', 'global');
    const globalSnap = await getDoc(globalRef);
    
    let configData: any = {
      expenseCategories: [],
      vendors: [],
    };
    
    if (globalSnap.exists()) {
      const globalData = globalSnap.data();
      // Copier uniquement expenseCategories et vendors
      if (globalData.expenseCategories) {
        configData.expenseCategories = globalData.expenseCategories;
      }
      if (globalData.vendors) {
        configData.vendors = globalData.vendors;
      }
      console.log(`Config globale copiée pour org ${orgId}:`, configData);
    } else {
      console.log(`Aucune config globale trouvée, création d'une config vide pour org ${orgId}`);
    }
    
    // Ajouter les métadonnées
    const now = new Date();
    configData.createdAt = serverTimestamp();
    configData.createdBy = createdBy || 'system';
    configData.updatedAt = serverTimestamp();
    configData.updatedBy = createdBy || 'system';
    
    // Écrire dans config/{orgId}
    const orgConfigRef = doc(firestoreDb, 'config', orgId);
    await setDoc(orgConfigRef, configData);
    
    console.log(`Configuration initialisée avec succès pour org ${orgId}`);
  } catch (error) {
    console.error(`Erreur lors de l'initialisation de la config pour org ${orgId}:`, error);
    // Ne pas throw l'erreur, juste logger - l'org sera créée avec une config vide
  }
}

export default {
  getExpenseConfig,
  updateExpenseConfig,
  initializeOrgConfig,
};
