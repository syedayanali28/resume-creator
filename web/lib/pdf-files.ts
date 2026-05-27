import fs from "node:fs";
import path from "node:path";
import type { PdfKind } from "@/lib/blob-pdfs";
import { getPeopleRoot } from "@/lib/paths";

export type { PdfKind };

export function packetStem(person: string, company: string, role: string): string {
  return `${person}_${company}_${role}`;
}

export function pdfFilename(person: string, company: string, role: string, kind: PdfKind): string {
  const stem = packetStem(person, company, role);
  return kind === "resume" ? `${stem}_resume.pdf` : `${stem}_cover-letter.pdf`;
}

export function rolePdfAbsPath(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): string {
  const peopleRoot = path.resolve(getPeopleRoot());
  const roleDir = path.resolve(peopleRoot, person, company, role);
  return path.join(roleDir, pdfFilename(person, company, role, kind));
}

export function localPdfExists(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): boolean {
  const abs = rolePdfAbsPath(person, company, role, kind);
  try {
    return fs.existsSync(abs) && fs.statSync(abs).isFile();
  } catch {
    return false;
  }
}

export function pdfApiUrl(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
  options?: { inline?: boolean },
): string {
  const base = `/api/files/${encodeURIComponent(person)}/${encodeURIComponent(company)}/${encodeURIComponent(role)}/${kind}`;
  return options?.inline ? `${base}?view=1` : base;
}

export function pdfViewerPageUrl(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): string {
  return `/person/${encodeURIComponent(person)}/pdf?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&kind=${kind}`;
}
