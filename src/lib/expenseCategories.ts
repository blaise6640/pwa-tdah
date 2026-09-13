import { doc, getDoc, setDoc, updateDoc, arrayUnion, Firestore } from 'firebase/firestore';
import { db } from '../firebase';

export interface ExpenseCategoryConfig {
  id: string;
  label: string;
  order?: number;
  active?: boolean;
}

/**
 * Récupère les catégories de dépenses pour une organisation spécifique.
 * @param dbInstance - Instance Firestore (optionnel, utilise db par défaut)
 * @param orgId - Identifiant de l'organisation (obligatoire)
 * @returns Liste des catégories de dépenses actives triées par ordre
 */
export async function getExpenseCategories(dbInstance: Firestore | null = null, orgId: string): Promise<ExpenseCategoryConfig[]> {
  if (!orgId) {
    throw new Error('orgId is required for getExpenseCategories');
  }
  
  const firestoreDb = dbInstance || db;
  const docRef = doc(firestoreDb, 'config', orgId);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return [{ id: 'autre', label: 'Autre', order: 999, active: true }];
  }
  
  const arr = (snap.data().expenseCategories || []) as any[];
  return arr
    .filter(c => c && c.active !== false)
    .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
    .map(c => ({ id: c.id, label: c.label, order: c.order, active: c.active }));
}

/**
 * Ajoute une nouvelle catégorie de dépenses pour une organisation
 * @param orgId - Identifiant de l'organisation
 * @param categoryId - Identifiant unique de la catégorie (slug)
 * @param categoryLabel - Libellé affiché de la catégorie
 * @returns La catégorie créée
 */
export async function addExpenseCategory(
  orgId: string,
  categoryId: string,
  categoryLabel: string
): Promise<ExpenseCategoryConfig> {
  if (!orgId || !categoryId || !categoryLabel) {
    throw new Error('orgId, categoryId et categoryLabel sont requis');
  }

  const docRef = doc(db, 'config', orgId);
  const snap = await getDoc(docRef);

  const newCategory: ExpenseCategoryConfig = {
    id: categoryId,
    label: categoryLabel,
    order: 999,
    active: true
  };

  if (!snap.exists()) {
    // Créer le document config avec la première catégorie
    await setDoc(docRef, {
      expenseCategories: [newCategory]
    });
  } else {
    // Vérifier si la catégorie existe déjà
    const existingCategories = (snap.data().expenseCategories || []) as ExpenseCategoryConfig[];
    const exists = existingCategories.some(c => c.id === categoryId);
    
    if (!exists) {
      // Ajouter la nouvelle catégorie
      await updateDoc(docRef, {
        expenseCategories: arrayUnion(newCategory)
      });
    }
  }

  return newCategory;
}
