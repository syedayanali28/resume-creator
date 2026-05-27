"use client";

import { normalizeJobPostingUrl } from "@/lib/job-from-url";

export type EnqueueTailorJobInput = {
  personSlug: string;
  jobPostingUrl: string;
  companySlug: string;
  roleSlug: string;
  modelId?: string;
};

/** Enqueue via /api/cursor-tailor/queue */
export async function enqueueTailorJob(
  input: EnqueueTailorJobInput,
): Promise<{ ok: true; item: unknown } | { ok: false; error: string; status: number }> {
  const jobPostingUrl = normalizeJobPostingUrl(input.jobPostingUrl);
  const res = await fetch("/api/cursor-tailor/queue", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personSlug: input.personSlug,
      companySlug: input.companySlug,
      roleSlug: input.roleSlug,
      jobPostingUrl,
      modelId: input.modelId ?? "composer-2",
    }),
  });
  const data = (await res.json()) as { item?: unknown; error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? `Queue failed (${res.status})`, status: res.status };
  }
  if (!data.item) {
    return { ok: false, error: "No queue item returned.", status: res.status };
  }
  return { ok: true, item: data.item };
}

export async function inferJobFolderSlugs(
  jobUrl: string,
): Promise<{ companySlug: string; roleSlug: string }> {
  try {
    const res = await fetch("/api/job-link-preview", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobUrl: normalizeJobPostingUrl(jobUrl) }),
    });
    const data = (await res.json()) as { companySlug?: string; roleSlug?: string };
    if (res.ok && data.companySlug && data.roleSlug) {
      return { companySlug: data.companySlug, roleSlug: data.roleSlug };
    }
  } catch {
    /* fallback */
  }
  return { companySlug: "Company", roleSlug: "Role" };
}
