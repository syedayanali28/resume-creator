"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JobRunViewer } from "./job-run-viewer";
import { JobPdfDownloads } from "@/components/tailor-queue/job-pdf-downloads";
import { JobSkipButton } from "@/components/tailor-queue/job-skip-button";
import { JobSearchBar } from "@/components/tailor-queue/job-search-bar";
import { filterTailorQueueJobs } from "@/lib/tailor-queue-search";
import { useTailorQueue } from "@/lib/use-tailor-queue";

function when(item: { finishedAt?: string; createdAt?: string }): string {
  const raw = item.finishedAt ?? item.createdAt;
  return raw ? new Date(raw).toLocaleString() : "—";
}

function statusLabel(status: string): string {
  if (status === "queued") return "Waiting";
  if (status === "running") return "Running";
  if (status === "finished") return "Done";
  return "Failed";
}

export function HistoryPanel() {
  const { items, error, refresh } = useTailorQueue();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const visible = useMemo(
    () => filterTailorQueueJobs(items, { query: searchQuery }),
    [items, searchQuery],
  );

  const selected = useMemo(
    () => visible.find((x) => x.id === selectedId) ?? items.find((x) => x.id === selectedId) ?? null,
    [visible, items, selectedId],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">History</h1>
        <button
          type="button"
          onClick={() => void refresh(true)}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Refresh
        </button>
      </div>

      <JobSearchBar
        inputId="history-job-search"
        value={searchQuery}
        onChange={setSearchQuery}
        resultCount={visible.length}
        totalCount={items.length}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Job ID</th>
              <th className="px-4 py-2 font-medium">When</th>
              <th className="px-4 py-2 font-medium">Person</th>
              <th className="px-4 py-2 font-medium">Job</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Files</th>
              <th className="px-4 py-2 font-medium w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  {searchQuery.trim() ? "No jobs match your search." : "No jobs yet."}
                </td>
              </tr>
            ) : (
              visible.map((item) => {
                const active = selectedId === item.id;
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={
                      active
                        ? "cursor-pointer bg-sky-50 text-slate-900"
                        : "cursor-pointer text-slate-700 hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs">{item.jobId ?? item.id}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{when(item)}</td>
                    <td className="px-4 py-3">{item.personSlug.replaceAll("-", " ")}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium">
                        {item.companySlug} / {item.roleSlug}
                      </div>
                      <a
                        href={item.jobPostingUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 block truncate text-xs text-sky-700 hover:underline"
                      >
                        {item.jobPostingUrl}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-col gap-0.5">
                        <span>{statusLabel(item.status)}</span>
                        {item.status === "running" && !item.id.startsWith("packet-") ? (
                          <span className="text-[10px] text-slate-400">Auto-skip after 2m idle</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {item.status === "finished" ? (
                        <JobPdfDownloads
                          personSlug={item.personSlug}
                          companySlug={item.companySlug}
                          roleSlug={item.roleSlug}
                          compact
                          showMissingHint
                          syncToBlobIfMissing
                        />
                      ) : (
                        <Link
                          href={`/person/${encodeURIComponent(item.personSlug)}?company=${encodeURIComponent(item.companySlug)}&role=${encodeURIComponent(item.roleSlug)}`}
                          className="text-sky-700 hover:underline"
                        >
                          Folder
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {item.status === "running" && !item.id.startsWith("packet-") ? (
                        <JobSkipButton jobId={item.id} onSkipped={() => void refresh(true)} />
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <JobRunViewer
        job={selected}
        onSkipped={() => void refresh(true)}
      />
    </div>
  );
}
