import dayjs from 'dayjs';

/**
 * Normalize different date-like inputs and return a string in DD-MM-YYYY format.
 * Accepts Date, number (timestamp), string, Firestore Timestamp-like ({ toDate() }), or dayjs.
 */
export default function formatDate(d: any, fallback = '-', showTime = false): string {
  if (d === null || d === undefined) return fallback;

  try {
    // Par défaut, on ne montre jamais le temps sauf si explicitement demandé
    const format = showTime ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY';
    
    // Firestore timestamp-like
    if (typeof d === 'object' && d !== null && typeof d.toDate === 'function') {
      const dt = d.toDate();
      return dayjs(dt).format(format);
    }

    // dayjs object
    if (d && typeof d.format === 'function') {
      return d.format(format);
    }

    // Date
    if (d instanceof Date) return dayjs(d).format(format);

    // number (timestamp)
    if (typeof d === 'number') return dayjs(d).format(format);

    // string
    if (typeof d === 'string') {
      // try ISO parse
      const parsed = dayjs(d);
      if (parsed.isValid()) return parsed.format(format);
      // fallback to JS Date
      const asDate = new Date(d);
      if (!Number.isNaN(asDate.getTime())) return dayjs(asDate).format(format);
      return fallback;
    }

    return fallback;
  } catch (e) {
    return fallback;
  }
}
