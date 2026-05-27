import { githubRawPdfUrl } from "@/lib/github-raw-pdf";
import type { PdfKind } from "@/lib/pdf-files";

const RETRY_DELAYS_MS = [0, 3_000, 6_000, 12_000, 20_000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Fetch a PDF from GitHub after a cloud agent push (retries while the commit propagates). */
export async function fetchGithubPdfBytes(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): Promise<Buffer | null> {
  const url = githubRawPdfUrl(person, company, role, kind);
  if (!url) return null;

  for (const delayMs of RETRY_DELAYS_MS) {
    if (delayMs > 0) await sleep(delayMs);
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/pdf" },
      });
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // try again
    }
  }

  return null;
}
