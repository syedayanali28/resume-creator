import { getBlobPdfAvailability } from "@/lib/blob-pdfs";
import { localPdfExists, type PdfKind } from "@/lib/pdf-files";

export type RolePdfAvailability = {
  hasResume: boolean;
  hasCover: boolean;
};

export async function getRolePdfAvailability(
  person: string,
  company: string,
  role: string,
): Promise<RolePdfAvailability> {
  const blob = await getBlobPdfAvailability(person, company, role);
  return {
    hasResume: localPdfExists(person, company, role, "resume") || blob.hasResume,
    hasCover: localPdfExists(person, company, role, "cover-letter") || blob.hasCover,
  };
}

export function localRolePdfAvailability(
  person: string,
  company: string,
  role: string,
): RolePdfAvailability {
  return {
    hasResume: localPdfExists(person, company, role, "resume"),
    hasCover: localPdfExists(person, company, role, "cover-letter"),
  };
}

export function kindAvailable(
  availability: RolePdfAvailability,
  kind: PdfKind,
): boolean {
  return kind === "resume" ? availability.hasResume : availability.hasCover;
}
