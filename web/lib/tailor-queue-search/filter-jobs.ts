import type { FilterTailorQueueOptions, TailorQueueSearchable } from "./types";
import { parseTailorQueueSearchQuery } from "./parse-query";
import { tailorQueueJobMatchesQuery } from "./match-job";

/**
 * Filter queue rows for UI lists. Jobs are never removed from storage;
 * an empty query returns every job.
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
    return jobs;
  }

  return jobs.filter((job) => tailorQueueJobMatchesQuery(job, parsed));
}
