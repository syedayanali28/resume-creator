import type { TailorQueueSearchable } from "./types";
import { normalizeSearchText } from "./normalize";

export type TailorQueueSearchDocument = {
  person: string;
  company: string;
  role: string;
  link: string;
  jobId: string;
  /** All fields joined for free-text search. */
  all: string;
};

function slugToLabel(slug: string): string {
  return slug.replaceAll("-", " ").replaceAll("_", " ");
}

/** Build normalized searchable text from one queue row (single place for field mapping). */
export function buildTailorQueueSearchDocument(job: TailorQueueSearchable): TailorQueueSearchDocument {
  const person = normalizeSearchText(slugToLabel(job.personSlug));
  const company = normalizeSearchText(slugToLabel(job.companySlug));
  const role = normalizeSearchText(slugToLabel(job.roleSlug));
  const link = normalizeSearchText(job.jobPostingUrl);
  const jobId = normalizeSearchText(job.jobId ?? job.id);
  const all = [person, company, role, link, jobId].join(" ");
  return { person, company, role, link, jobId, all };
}
