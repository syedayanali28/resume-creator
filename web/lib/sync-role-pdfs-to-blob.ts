import fs from "node:fs/promises";
import { put } from "@vercel/blob";
import { clearRoleBlobCache, isBlobConfigured } from "@/lib/blob-pdfs";
import { fetchGithubPdfBytes } from "@/lib/fetch-github-pdf";
import { localPdfExists, pdfFilename, rolePdfAbsPath, type PdfKind } from "@/lib/pdf-files";

export type RoleBlobSyncResult = {
  resume: boolean;
  cover: boolean;
};

function blobPathname(person: string, company: string, role: string, kind: PdfKind): string {
  const filename = pdfFilename(person, company, role, kind);
  return `people/${person}/${company}/${role}/${filename}`;
}

async function putPdfToBlob(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
  data: Buffer,
): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return false;

  await put(blobPathname(person, company, role, kind), data, {
    token,
    access: "public",
    addRandomSuffix: false,
    contentType: "application/pdf",
    allowOverwrite: true,
  });
  return true;
}

async function syncKindToBlob(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): Promise<boolean> {
  if (!isBlobConfigured()) return false;

  if (localPdfExists(person, company, role, kind)) {
    const abs = rolePdfAbsPath(person, company, role, kind);
    const data = await fs.readFile(abs);
    return putPdfToBlob(person, company, role, kind, data);
  }

  const fromGithub = await fetchGithubPdfBytes(person, company, role, kind);
  if (!fromGithub) return false;
  return putPdfToBlob(person, company, role, kind, fromGithub);
}

/**
 * Upload role PDFs to Vercel Blob from local disk or GitHub (after cloud runs).
 * Required for remote download when the app runs on Vercel without a full `people/` tree.
 */
export async function syncRolePdfsToBlob(
  person: string,
  company: string,
  role: string,
): Promise<RoleBlobSyncResult> {
  if (!isBlobConfigured()) {
    return { resume: false, cover: false };
  }

  const resume = await syncKindToBlob(person, company, role, "resume");
  const cover = await syncKindToBlob(person, company, role, "cover-letter");
  clearRoleBlobCache(person, company, role);
  return { resume, cover };
}
