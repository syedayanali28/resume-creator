import type { FilterTailorQueueOptions, TailorQueueSearchable } from "./types";
import { parseTailorQueueSearchQuery } from "./parse-query";
import { isTailorQueueJobHidden, tailorQueueJobMatchesQuery } from "./match-job";

/**
 * Filter queue rows for UI lists.
 *
 * Default (no query): active jobs only (not hidden).
 * With query: matching jobs, including hidden when `searchIncludesHidden` is true.
 */
export function filterTailorQueueJobs<T extends TailorQueueSearchable>(
  jobs: T[],
  options: FilterTailorQueueOptions = {},
): T[] {
  const rawQuery = options.query?.trim() ?? "";
  const parsed = parseTailorQueueSearchQuery(rawQuery);
  const hasQuery =
    rawQuery.length > 0 &&
    (parsed.freeTerms.length > 0 ||
      Boolean(parsed.person || parsed.company || parsed.role || parsed.link));

  if (!hasQuery) {
    return jobs.filter((j) => !isTailorQueueJobHidden(j));
  }

  const includeHidden = options.searchIncludesHidden !== false;

  return jobs.filter((job) => {
    if (!includeHidden && isTailorQueueJobHidden(job)) return false;
    return tailorQueueJobMatchesQuery(job, parsed);
  });
}
