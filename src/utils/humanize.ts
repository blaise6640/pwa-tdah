export function humanizeFrequency(freq?: string) {
  switch ((freq || '').toString()) {
    case 'one-off':
      return 'Ponctuelle';
    case 'monthly':
      return 'Mensuelle';
    case 'quarterly':
      return 'Trimestrielle';
    case 'semiannual':
      return 'Semestrielle';
    case 'yearly':
      return 'Annuelle';
    default:
      return freq || '';
  }
}
