export const CANONICAL_FREQUENCIES = ['one-off', 'monthly', 'quarterly', 'semiannual', 'yearly'] as const;
export type CanonicalFrequency = typeof CANONICAL_FREQUENCIES[number];

export function normalizeFrequency(input: any): CanonicalFrequency | null {
  if (input === undefined || input === null) return null;
  const v = String(input).toLowerCase();
  // Specific checks first to avoid accidental matches (e.g. 'biannual' contains 'ann')
  if (v.includes('one-off') || v === 'oneoff' || v === 'once' || v === 'unique' || v === 'ponctuel' || v === 'ponctuelle') return 'one-off';
  if (v.includes('sem') || v.includes('semestr') || v === 'semiannual' || v === 'biannual' || v === 'semi-annuel' || v === 'semestriel' || v === 'semestrielle') return 'semiannual';
  if (v.includes('trimes') || v === 'quarterly' || v === 'quarter' || v === 'trim') return 'quarterly';
  if (v.includes('month') || v.includes('mens') || v === 'monthly' || v === 'mensuel' || v === 'mensuelle') return 'monthly';
  // Fallback for yearly-like words (checked last because 'biannual' contains 'ann')
  if (v.includes('ann') || v === 'annual' || v === 'year' || v === 'yearly' || v === 'annually' || v === 'annuel' || v === 'annuelle') return 'yearly';
  if (v === 'one-off' || v === 'oneoff' || v === 'once' || v === 'unique' || v === 'ponctuel' || v === 'ponctuelle') return 'one-off';
  if ((CANONICAL_FREQUENCIES as readonly string[]).includes(v)) return v as CanonicalFrequency;
  return null;
}
