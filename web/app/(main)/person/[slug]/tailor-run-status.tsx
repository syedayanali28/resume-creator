"use client";

import { useEffect, useMemo, useState } from "react";

type QueueItem = {
  id: string;
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  modelId: string;
  status: "queued" | "running" | "finished" | "error";
  runId?: string;
  prUrl?: string | null;
  mergedAt?: string;
  mergeError?: string;
  error?: string;
  updatedAt?: string;
};

function statusClass(status: QueueItem["status"]): string {
  if (status === "finished") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "running") return "text-sky-700 bg-sky-50 border-sky-200";
  if (status === "queued") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

export function TailorRunStatus({ personSlug }: { personSlug: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch(`/api/cursor-tailor/queue?person=${encodeURIComponent(personSlug)}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { items?: QueueItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Failed to load runs (${res.status})`);
        return;
      }
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError("Network error loading queue runs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, 7000);
    return () => window.clearInterval(timer);
  }, [personSlug]);

  const activeCount = useMemo(
    () => items.filter((x) => x.status === "queued" || x.status === "running").length,
    [items],
  );

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">AI tailor remote queue</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Tracks cloud runs even after you leave the tailor page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            Active: {activeCount}
          </span>
          <button
            type="button"
            onClick={() => {
              void refresh();
            }}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No queued or completed runs yet for this profile.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
          <div className="max-h-60 overflow-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Packet</th>
                  <th className="px-3 py-2">Model</th>
                  <th className="px-3 py-2">Updated</th>
                  <th className="px-3 py-2">Merge</th>
                  <th className="px-3 py-2">Run</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 text-slate-700">
                    <td className="px-3 py-2">
                      <span className={`rounded-md border px-2 py-0.5 font-medium ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {item.companySlug}/{item.roleSlug}
                    </td>
                    <td className="px-3 py-2">{item.modelId}</td>
                    <td className="px-3 py-2">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}</td>
                    <td className="px-3 py-2">
                      {item.status !== "finished" ? (
                        <span className="text-slate-500">—</span>
                      ) : item.prUrl ? (
                        item.mergedAt ? (
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                            Merged
                          </span>
                        ) : item.mergeError ? (
                          <span className="text-rose-700">{item.mergeError}</span>
                        ) : (
                          <span className="text-slate-500">Pending merge</span>
                        )
                      ) : (
                        <span className="text-slate-500">No PR</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {item.runId ? <span className="font-mono">{item.runId}</span> : "—"}
                      {item.prUrl ? (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={item.prUrl}
                            className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                            target="_blank"
                            rel="noreferrer"
                          >
                            PR
                          </a>
                        </>
                      ) : null}
                      {item.error ? <span className="ml-2 text-rose-700">{item.error}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

