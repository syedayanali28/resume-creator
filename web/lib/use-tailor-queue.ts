"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TailorQueueRow = {
  id: string;
  jobId?: string;
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
  status: "queued" | "running" | "finished" | "error";
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string;
  hiddenAt?: string;
  agentId?: string;
  runId?: string;
  summary?: string | null;
  durationMs?: number | null;
  error?: string;
};

function hasActiveJobs(items: TailorQueueRow[]): boolean {
  return items.some((i) => i.status === "queued" || i.status === "running");
}

/** Polls the queue sparingly: fast read by default; advance=1 only while jobs are running. */
export function useTailorQueue(options?: { personSlug?: string; includeHidden?: boolean }) {
  const personSlug = options?.personSlug;
  const includeHidden = options?.includeHidden === true;
  const [items, setItems] = useState<TailorQueueRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fetchQueue = useCallback(
    async (advance: boolean): Promise<TailorQueueRow[]> => {
      const params = new URLSearchParams();
      if (personSlug) params.set("person", personSlug);
      if (includeHidden) params.set("includeHidden", "1");
      if (advance) params.set("advance", "1");
      const res = await fetch(`/api/cursor-tailor/queue?${params}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { items?: TailorQueueRow[]; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? `Queue failed (${res.status})`);
      }
      return data.items ?? [];
    },
    [personSlug, includeHidden],
  );

  const refresh = useCallback(
    async (advance = true) => {
      try {
        const rows = await fetchQueue(advance);
        setItems(rows);
        setError(null);
        return rows;
      } catch (e) {
        const message = e instanceof Error ? e.message : "Could not load queue.";
        setError(message);
        return itemsRef.current;
      }
    },
    [fetchQueue],
  );

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const schedule = (ms: number, advance: boolean) => {
      timer = setTimeout(() => {
        void tick(advance);
      }, ms);
    };

    const tick = async (advance: boolean) => {
      try {
        const rows = await fetchQueue(advance);
        if (cancelled) return;
        setItems(rows);
        setError(null);
        if (hasActiveJobs(rows)) {
          schedule(8000, true);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not load queue.");
      }
    };

    void tick(false);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [fetchQueue]);

  return { items, error, refresh };
}
