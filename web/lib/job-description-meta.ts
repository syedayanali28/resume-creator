import fs from "fs";
import path from "path";
import { parse as parseYaml } from "yaml";
import {
  type ApplicationStatus,
  parseApplicationStatus,
} from "./application-status";

export type JobDescriptionMeta = {
  postedAt: string | null;
  appliedAt: string | null;
  status: ApplicationStatus;
  note: string | null;
  linkOverride: string | null;
};

const EMPTY_META: JobDescriptionMeta = {
  postedAt: null,
  appliedAt: null,
  status: parseApplicationStatus(undefined),
  note: null,
  linkOverride: null,
};

function findJobDescriptionFile(roleDir: string): string | null {
  let names: string[];
  try {
    names = fs.readdirSync(roleDir);
  } catch {
    return null;
  }
  const hit = names.find(
    (n) =>
      n.toLowerCase() === "job description.txt" ||
      n.toLowerCase() === "job-description.txt",
  );
  return hit ? path.join(roleDir, hit) : null;
}

function normalizeDate(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return null;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  }
  return null;
}

function asNonEmptyString(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const t = raw.trim();
  return t.length ? t : null;
}

/** Optional YAML front matter at top of `job description.txt`, delimited by `---` lines. */
export function readJobDescriptionMeta(roleDir: string): JobDescriptionMeta {
  const file = findJobDescriptionFile(roleDir);
  if (!file || !fs.existsSync(file)) return { ...EMPTY_META };

  let raw: string;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch {
    return { ...EMPTY_META };
  }

  const trimmed = raw.trimStart();
  if (!trimmed.startsWith("---")) return { ...EMPTY_META };

  const rest = trimmed.slice(3);
  const end = rest.indexOf("\n---");
  if (end === -1) return { ...EMPTY_META };

  const yamlBlock = rest.slice(0, end).trim();
  const doc = parseYaml(yamlBlock) as Record<string, unknown> | null;
  if (!doc || typeof doc !== "object") return { ...EMPTY_META };

  const postedAt =
    normalizeDate(doc.posted) ??
    normalizeDate(doc.posted_at) ??
    normalizeDate(doc["posted-at"]);
  const appliedAt =
    normalizeDate(doc.applied) ??
    normalizeDate(doc.applied_at) ??
    normalizeDate(doc["applied-at"]);
  const status = parseApplicationStatus(doc.status ?? doc.stage);
  const note =
    asNonEmptyString(doc.note) ??
    asNonEmptyString(doc.notes) ??
    asNonEmptyString(doc.update);
  const linkOverride =
    asNonEmptyString(doc.link) ??
    asNonEmptyString(doc.url) ??
    asNonEmptyString(doc.posting);

  return {
    postedAt,
    appliedAt,
    status,
    note,
    linkOverride: linkOverride && /^https?:\/\//i.test(linkOverride) ? linkOverride : null,
  };
}

export function roleHasJobDescriptionFile(roleDir: string): boolean {
  return findJobDescriptionFile(roleDir) !== null;
}
