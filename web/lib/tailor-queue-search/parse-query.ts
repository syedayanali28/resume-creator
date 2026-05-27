import type { ParsedSearchQuery, SearchField } from "./types";
import { normalizeSearchText } from "./normalize";

const FIELD_ALIASES: Record<string, SearchField> = {
  person: "person",
  people: "person",
  company: "company",
  org: "company",
  role: "role",
  title: "role",
  job: "role",
  link: "link",
  url: "link",
  linkedin: "link",
};

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]+)"|'([^']+)'|(\S+)/g;
  for (const m of input.matchAll(re)) {
    const piece = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (piece) tokens.push(piece);
  }
  return tokens;
}

function parseFieldToken(token: string): { field: SearchField; value: string } | null {
  const sep = token.includes("=") ? "=" : token.includes(":") ? ":" : null;
  if (!sep) return null;
  const idx = token.indexOf(sep);
  const rawKey = token.slice(0, idx).trim().toLowerCase();
  const rawValue = token.slice(idx + 1).trim();
  const field = FIELD_ALIASES[rawKey];
  if (!field || !rawValue) return null;
  return { field, value: rawValue };
}

/**
 * Parse search bar input.
 *
 * Examples:
 * - `person:yanbo company:linkedin`
 * - `role=expansion-manager link:4404580379`
 * - `tether remote` (free terms, AND across tokens)
 */
export function parseTailorQueueSearchQuery(raw: string): ParsedSearchQuery {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { freeTerms: [] };
  }

  const parsed: ParsedSearchQuery = { freeTerms: [] };

  for (const token of tokenize(trimmed)) {
    const field = parseFieldToken(token);
    if (field) {
      const value = normalizeSearchText(field.value);
      if (!value) continue;
      if (field.field === "person") parsed.person = value;
      else if (field.field === "company") parsed.company = value;
      else if (field.field === "role") parsed.role = value;
      else if (field.field === "link") parsed.link = value;
      continue;
    }

    const free = normalizeSearchText(token);
    if (free) parsed.freeTerms.push(free);
  }

  return parsed;
}
