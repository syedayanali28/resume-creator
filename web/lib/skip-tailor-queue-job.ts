import type { TailorQueueRow } from "@/lib/use-tailor-queue";

export async function skipTailorQueueJob(
  jobId: string,
): Promise<{ ok: true; item: TailorQueueRow } | { ok: false; error: string }> {
  const res = await fetch(`/api/cursor-tailor/queue/${encodeURIComponent(jobId)}/skip`, {
    method: "POST",
    credentials: "same-origin",
  });
  const data = (await res.json()) as { item?: TailorQueueRow; error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? `Skip failed (${res.status})` };
  }
  if (!data.item) {
    return { ok: false, error: "No job returned after skip." };
  }
  return { ok: true, item: data.item };
}
