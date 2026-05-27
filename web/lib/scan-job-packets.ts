import fs from "node:fs";
import path from "node:path";
import { list } from "@vercel/blob";
import { isBlobConfigured } from "@/lib/blob-pdfs";
import { localPdfExists, type PdfKind } from "@/lib/pdf-files";
import { getPeopleRoot } from "@/lib/paths";

export type JobPacketSource = "disk" | "blob";

export type JobPacketRecord = {
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string | null;
  hasResumePdf: boolean;
  hasCoverPdf: boolean;
  source: JobPacketSource;
  /** Best-effort timestamp (file mtime or blob uploadedAt). */
  updatedAt: string;
};

const LINK_FILES = [
  "link.txt",
  "job-link.txt",
  "job link.txt",
  "posting-url.txt",
];

function readPostingLink(roleDir: string): string | null {
  for (const name of LINK_FILES) {
    const p = path.join(roleDir, name);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
    const raw = fs.readFileSync(p, "utf8");
    const line =
      raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length > 0) ?? null;
    if (!line) continue;
    if (/^https?:\/\//i.test(line)) return line;
  }
  return null;
}

function roleMtimeIso(roleDir: string): string {
  try {
    const st = fs.statSync(roleDir);
    return new Date(st.mtimeMs).toISOString();
  } catch {
    return new Date(0).toISOString();
  }
}

/** Role folders under `people/` that have at least one tailored PDF on disk. */
export function scanJobPacketsOnDisk(personSlug?: string): JobPacketRecord[] {
  const root = getPeopleRoot();
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return [];
  }

  const people = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "node_modules" && !d.name.startsWith("."))
    .map((d) => d.name)
    .filter((name) => !personSlug || name === personSlug);

  const out: JobPacketRecord[] = [];

  for (const person of people) {
    const personDir = path.join(root, person);
    const companies = fs
      .readdirSync(personDir, { withFileTypes: true })
      .filter(
        (d) =>
          d.isDirectory() &&
          d.name !== "complete" &&
          !d.name.startsWith("."),
      )
      .map((d) => d.name);

    for (const company of companies) {
      const companyDir = path.join(personDir, company);
      const roles = fs
        .readdirSync(companyDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name);

      for (const role of roles) {
        const roleDir = path.join(companyDir, role);
        const hasResume = localPdfExists(person, company, role, "resume");
        const hasCover = localPdfExists(person, company, role, "cover-letter");
        if (!hasResume && !hasCover) continue;

        out.push({
          personSlug: person,
          companySlug: company,
          roleSlug: role,
          jobPostingUrl: readPostingLink(roleDir),
          hasResumePdf: hasResume,
          hasCoverPdf: hasCover,
          source: "disk",
          updatedAt: roleMtimeIso(roleDir),
        });
      }
    }
  }

  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function parsePacketPathname(pathname: string): {
  person: string;
  company: string;
  role: string;
  kind: PdfKind | null;
} | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length < 5 || parts[0] !== "people") return null;
  const [, person, company, role, filename] = parts;
  if (!person || !company || !role || !filename) return null;
  if (filename.endsWith("_resume.pdf")) {
    return { person, company, role, kind: "resume" };
  }
  if (filename.endsWith("_cover-letter.pdf")) {
    return { person, company, role, kind: "cover-letter" };
  }
  return null;
}

/** PDF packets stored in Vercel Blob (remote deploys without a `people/` tree). */
export async function scanJobPacketsOnBlob(personSlug?: string): Promise<JobPacketRecord[]> {
  if (!isBlobConfigured()) return [];

  const prefix = personSlug ? `people/${personSlug}/` : "people/";
  const files = await list({ prefix, limit: 1000 });
  const byRole = new Map<
    string,
    { person: string; company: string; role: string; resume: boolean; cover: boolean; updatedAt: string }
  >();

  for (const blob of files.blobs) {
    const parsed = parsePacketPathname(blob.pathname);
    if (!parsed || !parsed.kind) continue;
    const key = `${parsed.person}/${parsed.company}/${parsed.role}`;
    const prev = byRole.get(key) ?? {
      person: parsed.person,
      company: parsed.company,
      role: parsed.role,
      resume: false,
      cover: false,
      updatedAt: new Date(0).toISOString(),
    };
    if (parsed.kind === "resume") prev.resume = true;
    if (parsed.kind === "cover-letter") prev.cover = true;
    const uploaded = blob.uploadedAt;
    const at =
      uploaded instanceof Date
        ? uploaded.toISOString()
        : typeof uploaded === "string"
          ? uploaded
          : prev.updatedAt;
    if (at > prev.updatedAt) prev.updatedAt = at;
    byRole.set(key, prev);
  }

  return [...byRole.values()]
    .filter((r) => r.resume || r.cover)
    .map((r) => ({
      personSlug: r.person,
      companySlug: r.company,
      roleSlug: r.role,
      jobPostingUrl: null,
      hasResumePdf: r.resume,
      hasCoverPdf: r.cover,
      source: "blob" as const,
      updatedAt: r.updatedAt,
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function scanAllJobPackets(personSlug?: string): Promise<JobPacketRecord[]> {
  const disk = scanJobPacketsOnDisk(personSlug);
  const blob = await scanJobPacketsOnBlob(personSlug);
  const byKey = new Map<string, JobPacketRecord>();

  for (const p of [...disk, ...blob]) {
    const key = `${p.personSlug}/${p.companySlug}/${p.roleSlug}`;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, p);
      continue;
    }
    byKey.set(key, {
      ...prev,
      jobPostingUrl: prev.jobPostingUrl ?? p.jobPostingUrl,
      hasResumePdf: prev.hasResumePdf || p.hasResumePdf,
      hasCoverPdf: prev.hasCoverPdf || p.hasCoverPdf,
      source: prev.source === "disk" ? "disk" : p.source,
      updatedAt: prev.updatedAt > p.updatedAt ? prev.updatedAt : p.updatedAt,
    });
  }

  return [...byKey.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
