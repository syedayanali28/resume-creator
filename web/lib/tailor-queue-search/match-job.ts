import { buildTailorQueueSearchDocument } from "./build-document";
import { containsNormalized } from "./normalize";
import type { ParsedSearchQuery, TailorQueueSearchable } from "./types";

function fieldMatches(docValue: string, needle: string): boolean {
  return docValue.includes(needle);
}

/** Returns true when a job satisfies a parsed query (empty query matches all). */
export function tailorQueueJobMatchesQuery(
  job: TailorQueueSearchable,
  query: ParsedSearchQuery,
): boolean {
  const doc = buildTailorQueueSearchDocument(job);

  if (query.person && !fieldMatches(doc.person, query.person)) return false;
  if (query.company && !fieldMatches(doc.company, query.company)) return false;
  if (query.role && !fieldMatches(doc.role, query.role)) return false;
  if (query.link) {
    const linkOk =
      fieldMatches(doc.link, query.link) ||
      fieldMatches(doc.role, query.link) ||
      containsNormalized(job.jobPostingUrl, query.link);
    if (!linkOk) return false;
  }

  for (const term of query.freeTerms) {
    if (!fieldMatches(doc.all, term)) return false;
  }

  return true;
}

