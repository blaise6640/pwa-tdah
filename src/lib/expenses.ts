import { getDbInstance } from '../firebase';
import type { DocumentSnapshot } from 'firebase/firestore';
import { EXPENSE_FREQUENCIES, EXPENSE_SMOOTHING, ExpenseFrequency, ExpenseSmoothing } from '../settings/expenses';

// Expense model
export interface Expense {
  id: string;
  orgId: string;
  propertyId: string;
  label: string;
  category: string;
  amount?: number;
  amountEstimated: number;
  frequency: ExpenseFrequency;
  smoothing: ExpenseSmoothing;
  // Nouveau: indique si cette dépense peut être régularisée
  isRegularizable?: boolean;
  // Nouveau: mode par défaut de régularisation défini sur la dépense
  defaultRegularizationMode?: 'retroactive' | 'adjustment' | null;
  // Mois/année de départ pour la génération des flux (0-indexed month expected)
  startMonth?: number;
  startYear?: number;
  isCapex: boolean;
  amortizationPeriodMonths?: number;
  // Nouveau: statut global de la dépense
  status?: 'draft' | 'active' | 'paid' | 'cancelled';
  createdAt: Date;
  createdBy?: string;
  vendorCounterpartyId?: string;
}

/**
 * Map a Firestore DocumentSnapshot to an Expense, convertit les timestamps en Date et applique les valeurs par défaut.
 */
export function mapExpense(docSnap: DocumentSnapshot): Expense {
  const data = (docSnap.data && docSnap.data()) || {};

  const toDate = (v: any): Date => {
    if (!v) return new Date(0);
    if (v.toDate && typeof v.toDate === 'function') return v.toDate();
    if (v instanceof Date) return v;
    const parsed = new Date(v);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(0);
  };

  // Valeurs par défaut paramétrées
  const defaultFrequency: ExpenseFrequency = EXPENSE_FREQUENCIES[0]; // 'one-off'
  const defaultSmoothing: ExpenseSmoothing = EXPENSE_SMOOTHING[0]; // 'none'

  const frequency: ExpenseFrequency = (data.frequency && EXPENSE_FREQUENCIES.includes(data.frequency)) ? data.frequency : defaultFrequency;
  let smoothing: ExpenseSmoothing = (data.smoothing && EXPENSE_SMOOTHING.includes(data.smoothing)) ? data.smoothing : defaultSmoothing;
  if (frequency === 'monthly') smoothing = 'none';

  return {
    id: docSnap.id,
    orgId: data.orgId || '',
    propertyId: data.propertyId || '',
    label: data.label || '',
    category: data.category || 'autre',
    amount: typeof data.amount === 'number' ? data.amount : (data.amount !== undefined ? Number(data.amount) : undefined),
    amountEstimated: typeof data.amountEstimated === 'number' ? data.amountEstimated : (data.amountEstimated !== undefined ? Number(data.amountEstimated) : 0),
    frequency,
    smoothing,
    startMonth: typeof data.startMonth === 'number' ? data.startMonth : (data.startMonth !== undefined ? Number(data.startMonth) : undefined),
    startYear: typeof data.startYear === 'number' ? data.startYear : (data.startYear !== undefined ? Number(data.startYear) : undefined),
    // Appliquer les valeurs par défaut demandées
    isRegularizable: typeof data.isRegularizable === 'boolean' ? data.isRegularizable : false,
    defaultRegularizationMode: data.defaultRegularizationMode ?? null,
    regulatable: typeof data.regulatable === 'boolean' ? data.regulatable : false,
    isCapex: typeof data.isCapex === 'boolean' ? data.isCapex : false,
    amortizationPeriodMonths: typeof data.amortizationPeriodMonths === 'number' ? data.amortizationPeriodMonths : (data.amortizationPeriodMonths !== undefined ? Number(data.amortizationPeriodMonths) : undefined),
  status: (data.status as Expense['status']) ?? 'active',
    createdAt: toDate(data.createdAt),
    createdBy: data.createdBy,
    vendorCounterpartyId: data.vendorCounterpartyId,
  } as Expense;
}


const propertyExpensesCollection = (db: any, orgId: string, propertyId: string) => (db && (db as any).collection ? (db as any).collection('orgs') : null);
// We'll build the collection path inline using firestore helpers after obtaining db.

/**
 * Crée un document de dépense sous /orgs/{orgId}/properties/{propertyId}/expenses
 * Ajoute createdAt = serverTimestamp()
 */
export async function createExpenseMaster(orgId: string, propertyId: string, data: Partial<Expense>): Promise<Expense> {
  const db = await getDbInstance();
  const { collection, doc, setDoc, serverTimestamp } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'properties', propertyId, 'expenses');
  // Forcer smoothing à 'none' si frequency = 'monthly'
  let smoothing = data.smoothing;
  if (data.frequency === 'monthly') smoothing = 'none';
  const payload: any = {
    ...data,
    // passthrough startMonth/startYear if provided in data
    ...(typeof data.startMonth !== 'undefined' ? { startMonth: data.startMonth } : {}),
    ...(typeof data.startYear !== 'undefined' ? { startYear: data.startYear } : {}),
    smoothing,
    orgId,
    propertyId,
    createdAt: serverTimestamp(),
    // ensure status is set on creation
    status: data.status ?? 'active',
    // Champs CAPEX
    isCapex: typeof data.isCapex === 'boolean' ? data.isCapex : false,
  };
  if (typeof data.amortizationPeriodMonths === 'number') {
    payload.amortizationPeriodMonths = data.amortizationPeriodMonths;
  }
  // Générer un ID déterministe : orgId_propertyId_timestamp
  const now = Date.now();
  const customId = `exp_${orgId}_${propertyId}_${now}`;
  const ref = doc(col, customId);
  await setDoc(ref, payload);
  // Valeurs par défaut paramétrées
  const defaultFrequency: ExpenseFrequency = EXPENSE_FREQUENCIES[0];
  const defaultSmoothing: ExpenseSmoothing = EXPENSE_SMOOTHING[0];
  const frequency: ExpenseFrequency = (data.frequency && EXPENSE_FREQUENCIES.includes(data.frequency)) ? data.frequency : defaultFrequency;
  let smoothingResult: ExpenseSmoothing = (smoothing && EXPENSE_SMOOTHING.includes(smoothing)) ? smoothing : defaultSmoothing;
  if (frequency === 'monthly') smoothingResult = 'none';
  return {
    id: customId,
    orgId,
    propertyId,
    label: (data.label as string) || '',
    category: (data.category as string) || 'autre',
    amount: typeof data.amount === 'number' ? data.amount : (data.amount !== undefined ? Number(data.amount) : undefined),
    amountEstimated: typeof data.amountEstimated === 'number' ? data.amountEstimated : (data.amountEstimated !== undefined ? Number(data.amountEstimated) : 0),
    frequency,
    smoothing: smoothingResult,
    startMonth: typeof data.startMonth === 'number' ? data.startMonth : (data.startMonth !== undefined ? Number(data.startMonth) : undefined),
    startYear: typeof data.startYear === 'number' ? data.startYear : (data.startYear !== undefined ? Number(data.startYear) : undefined),
    // Remplacer l'ancien champ 'regulatable' par les nouveaux champs demandés
    isRegularizable: typeof data.isRegularizable === 'boolean' ? data.isRegularizable : false,
    defaultRegularizationMode: data.defaultRegularizationMode ?? null,
  status: (data.status as Expense['status']) ?? 'active',
    createdAt: new Date(),
    createdBy: data.createdBy,
    vendorCounterpartyId: data.vendorCounterpartyId,
    // Champs CAPEX
    isCapex: typeof data.isCapex === 'boolean' ? data.isCapex : false,
    amortizationPeriodMonths: typeof data.amortizationPeriodMonths === 'number' ? data.amortizationPeriodMonths : (data.amortizationPeriodMonths !== undefined ? Number(data.amortizationPeriodMonths) : undefined)
  } as Expense;
}

/**
 * Get all expenses for a property
 */
export async function getExpenses(orgId: string, propertyId: string): Promise<Expense[]> {
  const db = await getDbInstance();
  const { collection, getDocs } = await import('firebase/firestore');
  const col = collection(db, 'orgs', orgId, 'properties', propertyId, 'expenses');
  const snap = await getDocs(col);
  const out: Expense[] = [];
  snap.forEach((d) => {
    out.push(mapExpense(d as DocumentSnapshot));
  });
  return out;
}

/**
 * Update an existing expense document (merge) and return the updated Expense
 */
export async function updateExpense(orgId: string, propertyId: string, expenseId: string, data: Partial<Expense>): Promise<Expense> {
  const db = await getDbInstance();
  const { doc, setDoc, getDoc } = await import('firebase/firestore');
  const ref = doc(db, 'orgs', orgId, 'properties', propertyId, 'expenses', expenseId);
  await setDoc(ref, data as any, { merge: true });
  const snap = await getDoc(ref);
  return mapExpense(snap as DocumentSnapshot);
}

export default {
  mapExpense,
  createExpenseMaster,
  getExpenses,
  updateExpense,
};
