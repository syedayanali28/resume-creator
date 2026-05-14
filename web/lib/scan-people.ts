import fs from "node:fs";
import path from "node:path";
import type { ApplicationStatus } from "./application-status";
import { getBlobPdfAvailability } from "./blob-pdfs";
import { readJobDescriptionMeta, roleHasJobDescriptionFile } from "./job-description-meta";
import { getPeopleRoot } from "./paths";

export type RoleApplicationRow = {
  companySlug: string;
  roleSlug: string;
  link: string | null;
  postedAt: string | null;
  appliedAt: string | null;
  status: ApplicationStatus;
  note: string | null;
  hasResumePdf: boolean;
  hasCoverPdf: boolean;
  hasJobDescription: boolean;
};

export type PersonIndexEntry = {
  slug: string;
  companyCount: number;
  roleCount: number;
};

export type PersonDashboard = {
  slug: string;
  rows: RoleApplicationRow[];
};

const LINK_FILES = [
  "link.txt",
  "job-link.txt",
  "job link.txt",
  "posting-url.txt",
];

function readPostingLink(roleDir: string, metaLink: string | null): string | null {
  if (metaLink) return metaLink;
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
    return line;
  }
  return null;
}

function packetStem(person: string, company: string, role: string): string {
  return `${person}_${company}_${role}`;
}

async function scanRoleRow(
  person: string,
  company: string,
  role: string,
  roleDir: string,
): Promise<RoleApplicationRow> {
  const stem = packetStem(person, company, role);
  const meta = readJobDescriptionMeta(roleDir);
  const resumePdf = path.join(roleDir, `${stem}_resume.pdf`);
  const coverPdf = path.join(roleDir, `${stem}_cover-letter.pdf`);
  const blob = await getBlobPdfAvailability(person, company, role);
  const localResume = fs.existsSync(resumePdf);
  const localCover = fs.existsSync(coverPdf);
  return {
    companySlug: company,
    roleSlug: role,
    link: readPostingLink(roleDir, meta.linkOverride),
    postedAt: meta.postedAt,
    appliedAt: meta.appliedAt,
    status: meta.status,
    note: meta.note,
    hasResumePdf: localResume || blob.hasResume,
    hasCoverPdf: localCover || blob.hasCover,
    hasJobDescription: roleHasJobDescriptionFile(roleDir),
  };
}

/** Summary for the home page: one card per person under `people/`. */
export function scanPeopleIndex(): PersonIndexEntry[] {
  const root = getPeopleRoot();
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    return [];
  }

  const people = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "node_modules")
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const out: PersonIndexEntry[] = [];

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

    const companySet = new Set<string>();
    let roleCount = 0;

    for (const company of companies) {
      const companyDir = path.join(personDir, company);
      const roles = fs
        .readdirSync(companyDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith("."))
        .map((d) => d.name);

      if (roles.length === 0) continue;
      companySet.add(company);
      roleCount += roles.length;
    }

    if (roleCount > 0) {
      out.push({
        slug: person,
        companyCount: companySet.size,
        roleCount,
      });
    }
  }

  return out;
}

/** All applications for one person (sorted: company, then role). */
export async function getPersonDashboard(personSlug: string): Promise<PersonDashboard | null> {
  const root = getPeopleRoot();
  const personDir = path.join(root, personSlug);
  if (
    !fs.existsSync(personDir) ||
    !fs.statSync(personDir).isDirectory() ||
    personSlug === "node_modules"
  ) {
    return null;
  }

  const companies = fs
    .readdirSync(personDir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        d.name !== "complete" &&
        !d.name.startsWith("."),
    )
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b));

  const rows: RoleApplicationRow[] = [];

  for (const company of companies) {
    const companyDir = path.join(personDir, company);
    const roles = fs
      .readdirSync(companyDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name)
      .sort((a, b) => a.localeCompare(b));

    for (const role of roles) {
      const roleDir = path.join(companyDir, role);
      rows.push(await scanRoleRow(personSlug, company, role, roleDir));
    }
  }

  return { slug: personSlug, rows };
}
