/** Collapse slug/url text into comparable lowercase tokens. */
export function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/[-_]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

export function containsNormalized(haystack: string, needle: string): boolean {
  const n = normalizeSearchText(needle);
  if (!n) return true;
  return normalizeSearchText(haystack).includes(n);
}
