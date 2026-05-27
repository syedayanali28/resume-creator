export type HideTailorQueueResult =
  | { ok: true; item: { id: string; hiddenAt?: string } }
  | { ok: false; error: string };

/** Soft-delete: hide a job from default lists; it remains in storage for History search. */
export async function hideTailorQueueJob(id: string): Promise<HideTailorQueueResult> {
  const res = await fetch(`/api/cursor-tailor/queue/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "same-origin",
  });
  const data = (await res.json()) as { item?: { id: string; hiddenAt?: string }; error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error ?? `Hide failed (${res.status})` };
  }
  if (!data.item?.id) {
    return { ok: false, error: "Job not found." };
  }
  return { ok: true, item: data.item };
}
