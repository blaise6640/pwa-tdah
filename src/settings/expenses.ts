// Paramètres pour les dépenses (Expense)
// Ces listes sont extensibles et peuvent être importées dans tout le projet.

export const EXPENSE_FREQUENCIES = [
  'one-off',
  'monthly',
  'quarterly',
  'semiannual',
  'yearly',
  // Ajouter d'autres fréquences si besoin
] as const;

export const EXPENSE_SMOOTHING = [
  'none',
  'monthly',
  'monthly_prorata',
  // Ajouter d'autres modes de lissage si besoin
] as const;

export type ExpenseFrequency = typeof EXPENSE_FREQUENCIES[number];
export type ExpenseSmoothing = typeof EXPENSE_SMOOTHING[number];
