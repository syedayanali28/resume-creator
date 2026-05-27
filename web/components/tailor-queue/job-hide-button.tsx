"use client";

import { hideTailorQueueJob } from "@/lib/hide-tailor-queue-job";
import { useState } from "react";

type JobHideButtonProps = {
  jobId: string;
  status: string;
  onHidden: () => void;
  className?: string;
};

export function JobHideButton({ jobId, status, onHidden, className }: JobHideButtonProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (busy || status === "running") return;
    if (!globalThis.confirm("Remove this job from the list? You can find it again with search.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const result = await hideTailorQueueJob(jobId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onHidden();
  }

  return (
    <span className={className}>
      <button
        type="button"
        disabled={busy || status === "running"}
        onClick={(e) => void onClick(e)}
        title={
          status === "running"
            ? "Wait until the job finishes"
            : "Remove from list (still searchable)"
        }
        className="rounded px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "…" : "Delete"}
      </button>
      {error ? <span className="ml-1 text-xs text-red-600">{error}</span> : null}
    </span>
  );
}
