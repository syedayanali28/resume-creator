import { cloudTargetBranch } from "@/lib/cursor-cloud-agent";
import { pdfFilename, type PdfKind } from "@/lib/pdf-files";

/** Public GitHub raw URL for a role PDF (when cloud agent pushed to the configured repo). */
export function githubRawPdfUrl(
  person: string,
  company: string,
  role: string,
  kind: PdfKind,
): string | null {
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  if (!repoUrl) return null;

  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?/i);
  if (!match) return null;

  const owner = match[1]!;
  const repo = match[2]!;
  const branch = cloudTargetBranch();
  const filename = pdfFilename(person, company, role, kind);
  const segments = [person, company, role, filename].map((s) =>
    s.split("/").map(encodeURIComponent).join("/"),
  );
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/people/${segments.join("/")}`;
}
