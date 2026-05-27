/** Detect agent output changes when polling Cursor runs. */
export function runProgressFingerprint(run: {
  status: string;
  result?: string | null;
  durationMs?: number | null;
}): string {
  const resultLen = run.result?.length ?? 0;
  const resultHead = run.result?.slice(0, 400) ?? "";
  return `${run.status}|${resultLen}|${resultHead}|${run.durationMs ?? ""}`;
}

export const NO_OUTPUT_STALL_MS = 2 * 60 * 1000;

export function stallMsSince(lastProgressAt: string | undefined, startedAt: string | undefined): number {
  const raw = lastProgressAt ?? startedAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  if (Number.isNaN(t)) return 0;
  return Date.now() - t;
}
