/** Minimal job shape required for search and visibility filtering. */
export type TailorQueueSearchable = {
  id: string;
  jobId?: string;
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
};

export type SearchField = "person" | "company" | "role" | "link";

export type ParsedSearchQuery = {
  /** Unqualified tokens; every term must match at least one field (AND). */
  freeTerms: string[];
  person?: string;
  company?: string;
  role?: string;
  link?: string;
};

export type FilterTailorQueueOptions = {
  /** Raw search bar input. Empty = show all jobs. */
  query?: string;
};
