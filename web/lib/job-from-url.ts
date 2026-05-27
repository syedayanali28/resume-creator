/**
 * Folder slugs under `people/<Person>/<Company>/<Role>/` must match paths.SAFE_SEGMENT.
 */

const MAX_SEGMENT = 72;

/** Strip diacritics, keep alphanumerics as hyphen-separated Title-Case segments. */
export function slugifyFolderSegment(raw: string, fallback: string): string {
  const base = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => {
      if (/^[A-Z0-9]{2,}$/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join("-");

  let out = base.replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!out || !/^[A-Za-z0-9]/.test(out)) {
    out = fallback.replace(/[^A-Za-z0-9.-]/g, "-").replace(/^-+/, "") || "Application";
  }
  if (out.length > MAX_SEGMENT) out = out.slice(0, MAX_SEGMENT).replace(/-+$/, "");
  return out;
}

export function linkedInJobViewId(url: URL): string | null {
  const m = url.pathname.match(/\/jobs\/view\/(\d+)/i);
  return m?.[1] ?? null;
}

function isLinkedInHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, "").toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

/** Drop tracking query params; LinkedIn jobs become `https://www.linkedin.com/jobs/view/{id}/`. */
export function normalizeJobPostingUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    if (isLinkedInHost(u.hostname)) {
      const jobId = linkedInJobViewId(u);
      if (jobId) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
      }
    }
    u.search = "";
    u.hash = "";
    let out = u.toString();
    if (out.endsWith("?")) out = out.slice(0, -1);
    return out;
  } catch {
    return trimmed;
  }
}

export function hostSlugForCompany(url: URL): string {
  const host = url.hostname.replace(/^www\./i, "").split(".")[0] ?? "site";
  return slugifyFolderSegment(host, "Company");
}

/** Parse LinkedIn-style og:title / document title into company + role strings. */
export function parseJobTitleFromPageTitle(title: string): { company: string; role: string } | null {
  const t = title
    .replace(/\s*\|\s*LinkedIn.*$/i, "")
    .replace(/\s*-\s*LinkedIn.*$/i, "")
    .trim();
  if (!t) return null;

  const hiring = t.match(/^(.+?)\s+hiring\s+(.+)$/i);
  if (hiring) {
    return { company: hiring[1]!.trim(), role: hiring[2]!.trim() };
  }

  const at = t.match(/^(.+?)\s+at\s+(.+)$/i);
  if (at) {
    return { company: at[2]!.trim(), role: at[1]!.trim() };
  }

  const pipe = t.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
  if (pipe.length >= 2) {
    return { company: pipe[1]!, role: pipe[0]! };
  }

  return null;
}

export function extractOgTitle(html: string): string | null {
  const m =
    html.match(/property=["']og:title["']\s+content=["']([^"']+)["']/i) ??
    html.match(/content=["']([^"']+)["']\s+property=["']og:title["']/i);
  if (m?.[1]) return decodeHtmlEntities(m[1].trim());

  const tm = html.match(/<title[^>]*>([^<]{1,500})<\/title>/i);
  if (tm?.[1]) return decodeHtmlEntities(tm[1].trim());

  return null;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export type SlugInferenceSource = "page-title" | "linkedin-job-id" | "hostname";

export function inferSlugsFromJobUrl(
  jobUrl: string,
  pageTitle: string | null,
): { companySlug: string; roleSlug: string; source: SlugInferenceSource; titleRaw: string | null } {
  const canonical = normalizeJobPostingUrl(jobUrl);
  let u: URL;
  try {
    u = new URL(canonical);
  } catch {
    return {
      companySlug: "Application",
      roleSlug: "Posting",
      source: "hostname",
      titleRaw: null,
    };
  }

  if (pageTitle) {
    const parsed = parseJobTitleFromPageTitle(pageTitle);
    if (parsed) {
      return {
        companySlug: slugifyFolderSegment(parsed.company, hostSlugForCompany(u)),
        roleSlug: slugifyFolderSegment(parsed.role, "Role"),
        source: "page-title",
        titleRaw: pageTitle,
      };
    }
  }

  const jobId = linkedInJobViewId(u);
  if (jobId) {
    return {
      companySlug: "LinkedIn",
      roleSlug: slugifyFolderSegment(`Job ${jobId}`, `Job-${jobId}`),
      source: "linkedin-job-id",
      titleRaw: pageTitle,
    };
  }

  return {
    companySlug: hostSlugForCompany(u),
    roleSlug: slugifyFolderSegment("Posting", "Posting"),
    source: "hostname",
    titleRaw: pageTitle,
  };
}
