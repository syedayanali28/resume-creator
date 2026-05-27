import { list } from "@vercel/blob";

export type PdfKind = "resume" | "cover-letter";

type RoleBlobAvailability = {
  resumeUrl: string | null;
  coverLetterUrl: string | null;
};

const roleBlobCache = new Map<string, Promise<RoleBlobAvailability>>();

function roleKey(person: string, company: string, role: string): string {
  return `${person}/${company}/${role}`;
}

function prefix(person: string, company: string, role: string): string {
  return `people/${person}/${company}/${role}/`;
}

function expectedFilename(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): string {
  const stem = `${person}_${company}_${role}`;
  return kind === "resume" ? `${stem}_resume.pdf` : `${stem}_cover-letter.pdf`;
}

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_TOKEN);
}

export function clearRoleBlobCache(person: string, company: string, role: string): void {
  roleBlobCache.delete(roleKey(person, company, role));
}

async function listRoleBlobs(
  person: string,
  company: string,
  role: string,
): Promise<RoleBlobAvailability> {
  const cacheKey = roleKey(person, company, role);
  const cached = roleBlobCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const promise = (async () => {
    if (!isBlobConfigured()) {
      return { resumeUrl: null, coverLetterUrl: null };
    }

    const rolePrefix = prefix(person, company, role);
    const files = await list({ prefix: rolePrefix, limit: 200 });
    const resumeName = expectedFilename(person, company, role, "resume");
    const coverName = expectedFilename(person, company, role, "cover-letter");

    let resumeUrl: string | null = null;
    let coverLetterUrl: string | null = null;

    for (const blob of files.blobs) {
      if (!resumeUrl && blob.pathname.endsWith(`/${resumeName}`)) {
        resumeUrl = blob.url;
      }
      if (!coverLetterUrl && blob.pathname.endsWith(`/${coverName}`)) {
        coverLetterUrl = blob.url;
      }
      if (resumeUrl && coverLetterUrl) break;
    }

    return { resumeUrl, coverLetterUrl };
  })();

  roleBlobCache.set(cacheKey, promise);
  return promise;
}

export async function getBlobPdfAvailability(
  person: string,
  company: string,
  role: string,
): Promise<{ hasResume: boolean; hasCover: boolean }> {
  const blob = await listRoleBlobs(person, company, role);
  return {
    hasResume: Boolean(blob.resumeUrl),
    hasCover: Boolean(blob.coverLetterUrl),
  };
}

export async function getBlobPdfUrl(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): Promise<string | null> {
  const blob = await listRoleBlobs(person, company, role);
  return kind === "resume" ? blob.resumeUrl : blob.coverLetterUrl;
}
