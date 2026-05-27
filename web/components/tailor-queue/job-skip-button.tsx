"use client";

import { skipTailorQueueJob } from "@/lib/skip-tailor-queue-job";
import { useState } from "react";

type JobSkipButtonProps = {
  jobId: string;
  onSkipped: () => void;
  className?: string;
};

export function JobSkipButton({ jobId, onSkipped, className }: JobSkipButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy) return;
    if (
      !globalThis.confirm(
        "Skip this run? It will move to the end of the queue and the next job will start.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await skipTailorQueueJob(jobId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSkipped();
  }

  return (
    <span className={className}>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => void onClick(e)}
        title="Skip: move to end of queue and run next job"
        className="rounded px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50"
      >
        {busy ? "…" : "Skip"}
      </button>
      {error ? <span className="ml-1 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
