import fs from "node:fs";
import path from "node:path";
import { getPeopleRoot } from "@/lib/paths";
import {
  pdfFilename,
  type PdfKind,
} from "@/lib/pdf-urls";

export type { PdfKind } from "@/lib/pdf-urls";
export { packetStem, pdfApiUrl, pdfFilename, pdfViewerPageUrl } from "@/lib/pdf-urls";

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
