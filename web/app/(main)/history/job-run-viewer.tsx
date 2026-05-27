"use client";

import { useEffect, useRef, useState } from "react";
import { JobPdfDownloads } from "@/components/tailor-queue/job-pdf-downloads";
import type { TailorQueueRow } from "@/lib/use-tailor-queue";

type StreamLine = {
  key: string;
  kind: "status" | "thinking" | "assistant" | "tool" | "meta" | "error";
  text: string;
};

type StreamEvent =
  | { type: "meta"; jobId: string; runId?: string; agentId?: string; status?: string }
  | { type: "status"; status: string }
  | { type: "thinking"; message: string }
  | { type: "assistant"; text: string }
  | { type: "tool_call"; name: string; status: string }
  | {
      type: "result";
      ok: boolean;
      status: string;
      summary: string | null;
      durationMs?: number | null;
    }
  | { type: "error"; error: string };

function statusLabel(status: TailorQueueRow["status"]): string {
  if (status === "queued") return "Waiting";
  if (status === "running") return "Running";
  if (status === "finished") return "Done";
  return "Failed";
}

function nextLineKey(jobId: string, seq: number): string {
  const nonce =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 9)}`;
  return `${jobId}:${nonce}`;
}

/** Stable stream identity: reconnect when a run starts, not on every queue poll tick. */
function streamIdentity(job: TailorQueueRow): string {
  return job.runId ?? job.id;
}

export function JobRunViewer({ job }: { job: TailorQueueRow | null }) {
  const [lines, setLines] = useState<StreamLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  /** Bumped on unmount/re-run so stale fetches cannot append lines. */
  const generationRef = useRef(0);

  const streamKey = job ? streamIdentity(job) : null;

  useEffect(() => {
    if (!job || !streamKey) {
      setLines([]);
      setStreamError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    const jobId = job.id;
    const generation = ++generationRef.current;
    const pending: StreamLine[] = [];
    let lineSeq = 0;
    let flushRaf = 0;

    setLoading(true);
    setLines([]);
    setStreamError(null);

    const isActive = () => !ac.signal.aborted && generationRef.current === generation;

    const flushLines = () => {
      if (!isActive()) return;
      setLines([...pending]);
    };

    const scheduleFlush = () => {
      if (!isActive()) return;
      if (flushRaf) return;
      flushRaf = requestAnimationFrame(() => {
        flushRaf = 0;
        flushLines();
      });
    };

    const push = (kind: StreamLine["kind"], text: string) => {
      if (!isActive()) return;
      lineSeq += 1;
      pending.push({ key: nextLineKey(jobId, lineSeq), kind, text });
      scheduleFlush();
    };

    void (async () => {
      try {
        const res = await fetch(
          `/api/cursor-tailor/queue/${encodeURIComponent(jobId)}/stream`,
          { signal: ac.signal },
        );
        if (!isActive()) return;
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setStreamError(data.error ?? `Failed to load output (${res.status})`);
          return;
        }
        if (!res.body) {
          setStreamError("Empty response from server.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (isActive()) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            if (!isActive()) return;
            const trimmed = part.trim();
            if (!trimmed) continue;
            try {
              const ev = JSON.parse(trimmed) as StreamEvent;
              if (ev.type === "meta") continue;
              if (ev.type === "status") push("status", `Status: ${ev.status}`);
              else if (ev.type === "thinking") push("thinking", ev.message);
              else if (ev.type === "assistant") push("assistant", ev.text);
              else if (ev.type === "tool_call") push("tool", `${ev.name}: ${ev.status}`);
              else if (ev.type === "result") {
                if (ev.summary) push("assistant", ev.summary);
                push("status", `Finished (${ev.status})`);
              } else if (ev.type === "error") push("error", ev.error);
            } catch {
              push("error", "Malformed stream event.");
            }
          }
        }

        if (isActive()) flushLines();
      } catch (e) {
        if (!isActive()) return;
        setStreamError(e instanceof Error ? e.message : "Stream failed.");
      } finally {
        if (flushRaf) cancelAnimationFrame(flushRaf);
        if (isActive()) setLoading(false);
      }
    })();

    return () => {
      ac.abort();
      if (flushRaf) cancelAnimationFrame(flushRaf);
      generationRef.current += 1;
    };
  }, [streamKey, job?.id]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (!job) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        Click a job to see the agent run.
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Job</p>
          <p className="font-mono text-sm font-semibold text-slate-900">{job.jobId ?? job.id}</p>
        </div>
        <span className="text-sm text-slate-600">{statusLabel(job.status)}</span>
      </div>

      <dl className="grid gap-1 text-xs text-slate-600 sm:grid-cols-2">
        {job.runId ? (
          <div>
            <dt className="text-slate-400">Run</dt>
            <dd className="font-mono break-all">{job.runId}</dd>
          </div>
        ) : null}
        {job.agentId ? (
          <div>
            <dt className="text-slate-400">Agent</dt>
            <dd className="font-mono break-all">{job.agentId}</dd>
          </div>
        ) : null}
      </dl>

      {streamError ? <p className="text-sm text-red-600">{streamError}</p> : null}

      {job.status === "finished" ? (
        <div className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            PDFs
          </p>
          <JobPdfDownloads
            personSlug={job.personSlug}
            companySlug={job.companySlug}
            roleSlug={job.roleSlug}
            showMissingHint
            syncToBlobIfMissing
          />
        </div>
      ) : null}

      <div
        ref={logRef}
        className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-100"
      >
        {loading && lines.length === 0 ? (
          <p className="text-slate-400">Loading agent output…</p>
        ) : lines.length === 0 ? (
          <p className="text-slate-400">
            {job.status === "queued"
              ? "Waiting to start…"
              : job.status === "running" && (!job.runId || !job.agentId)
                ? "Starting cloud agent… Output will appear when the run connects (often a few minutes). The queue advances when this finishes."
                : job.status === "running"
                  ? "Cloud agent is running. Live logs appear when Cursor streams them; many runs only show output near the end."
                  : job.error
                    ? job.error
                    : job.summary
                      ? job.summary
                      : "No output yet."}
          </p>
        ) : (
          lines.map((line) => (
            <p key={line.key} className="whitespace-pre-wrap break-words py-0.5">
              <span
                className={
                  line.kind === "error"
                    ? "text-rose-300"
                    : line.kind === "status"
                      ? "text-sky-300"
                      : line.kind === "tool"
                        ? "text-amber-300"
                        : line.kind === "thinking"
                          ? "text-violet-300"
                          : "text-slate-100"
                }
              >
                {line.text}
              </span>
            </p>
          ))
        )}
      </div>
    </div>
  );
}
