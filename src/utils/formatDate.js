/**
 * formatDateTime
 * Format a Firestore Timestamp or Date object using the user's locale (navigator.language)
 * Returns a localized date + time string, or '-' if invalid.
 */
export function formatDateTime(timestampOrDate) {
  if (!timestampOrDate) return '-';

  let date;
  try {
    if (typeof timestampOrDate.toDate === 'function') {
      date = timestampOrDate.toDate();
    } else if (timestampOrDate instanceof Date) {
      date = timestampOrDate;
    } else if (typeof timestampOrDate === 'number') {
      date = new Date(timestampOrDate);
    } else {
      return '-';
    }
  } catch (e) {
    return '-';
  }

  try {
    const locale = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : undefined;
    // Use dateStyle/timeStyle for concise localized formatting
    return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'medium' }).format(date);
  } catch (e) {
    return date.toLocaleString();
  }
}

export default formatDateTime;
