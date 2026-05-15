"use client";

import Link from "next/link";
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
  error?: string;
  updatedAt?: string;
};

function statusClass(status: QueueItem["status"]): string {
  if (status === "finished") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "running") return "text-sky-700 bg-sky-50 border-sky-200";
  if (status === "queued") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-rose-700 bg-rose-50 border-rose-200";
}

export function ActiveRunsPanel() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/cursor-tailor/queue", { credentials: "same-origin" });
      const data = (await res.json()) as { items?: QueueItem[]; error?: string };
      if (!res.ok) {
        setError(data.error ?? `Failed to load runs (${res.status})`);
        return;
      }
      setItems(data.items ?? []);
      setError(null);
    } catch {
      setError("Network error loading runs.");
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
  }, []);

  const counters = useMemo(
    () => ({
      queued: items.filter((x) => x.status === "queued").length,
      running: items.filter((x) => x.status === "running").length,
      finished: items.filter((x) => x.status === "finished").length,
      error: items.filter((x) => x.status === "error").length,
    }),
    [items],
  );

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Runs</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              My active runs
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Global monitor for all AI tailor jobs across people and roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/cursor-tailor"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
            >
              Open AI tailor
            </Link>
            <button
              type="button"
              onClick={() => {
                void refresh();
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-4">
          <Counter label="Queued" value={counters.queued} />
          <Counter label="Running" value={counters.running} />
          <Counter label="Finished" value={counters.finished} />
          <Counter label="Errors" value={counters.error} />
        </dl>
      </section>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40">
        <div className="overflow-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Person</th>
                <th className="px-4 py-3">Packet</th>
                <th className="px-4 py-3">Model</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3">Links</th>
                <th className="px-4 py-3">Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={7}>
                    No runs yet.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="text-slate-700">
                    <td className="px-4 py-3">
                      <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${statusClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.personSlug.replaceAll("-", " ")}</td>
                    <td className="px-4 py-3">
                      {item.companySlug}/{item.roleSlug}
                    </td>
                    <td className="px-4 py-3">{item.modelId}</td>
                    <td className="px-4 py-3">
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/person/${encodeURIComponent(item.personSlug)}?company=${encodeURIComponent(item.companySlug)}&role=${encodeURIComponent(item.roleSlug)}`}
                          className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                        >
                          Profile
                        </Link>
                        <Link
                          href={`/person/${encodeURIComponent(item.personSlug)}/pdf?company=${encodeURIComponent(item.companySlug)}&role=${encodeURIComponent(item.roleSlug)}&kind=resume`}
                          className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                        >
                          Resume
                        </Link>
                        <Link
                          href={`/person/${encodeURIComponent(item.personSlug)}/pdf?company=${encodeURIComponent(item.companySlug)}&role=${encodeURIComponent(item.roleSlug)}&kind=cover-letter`}
                          className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                        >
                          Cover
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {item.runId ? <span className="font-mono text-xs">{item.runId}</span> : "—"}
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
                      {item.error ? <p className="mt-1 text-xs text-rose-700">{item.error}</p> : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Counter({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

