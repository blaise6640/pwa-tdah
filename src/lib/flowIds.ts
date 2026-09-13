export function generateShortSuffix(randomChars = 8): string {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 2 + randomChars);
  return `${ts}${rnd}`;
}

export function createFlowDocIdShort(logicalId: string): string {
  const suffix = generateShortSuffix(8);
  return `${logicalId}-${suffix}`;
}

export function extractLogicalId(docId: string): string {
  const idx = docId.indexOf('-');
  if (idx === -1) return docId;
  // assume logicalId may contain dashes; find the prefix before the timestamp part
  // We'll prefer the first two segments if it matches 'flow_YYYY-MM' pattern
  return docId.split('-').slice(0, 2).join('-');
}
