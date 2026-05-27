/** Client-safe PDF path helpers (no Node.js built-ins). */

export type PdfKind = "resume" | "cover-letter";

export function packetStem(person: string, company: string, role: string): string {
  return `${person}_${company}_${role}`;
}

export function pdfFilename(person: string, company: string, role: string, kind: PdfKind): string {
  const stem = packetStem(person, company, role);
  return kind === "resume" ? `${stem}_resume.pdf` : `${stem}_cover-letter.pdf`;
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
