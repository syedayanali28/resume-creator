"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { JobRunViewer } from "./job-run-viewer";
import { JobHideButton } from "@/components/tailor-queue/job-hide-button";
import { JobSearchBar } from "@/components/tailor-queue/job-search-bar";
import { filterTailorQueueJobs, isTailorQueueJobHidden } from "@/lib/tailor-queue-search";
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
  const { items, error, refresh } = useTailorQueue({ includeHidden: true });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const visible = useMemo(
    () => filterTailorQueueJobs(items, { query: searchQuery, searchIncludesHidden: true }),
    [items, searchQuery],
  );

  const selected = useMemo(
    () => visible.find((x) => x.id === selectedId) ?? items.find((x) => x.id === selectedId) ?? null,
    [visible, items, selectedId],
  );

  function onJobHidden(id: string) {
    if (selectedId === id) setSelectedId(null);
    void refresh(false);
  }

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
              <th className="px-4 py-2 font-medium w-20" />
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
                const hidden = isTailorQueueJobHidden(item);
                return (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={
                      active
                        ? "cursor-pointer bg-sky-50 text-slate-900"
                        : hidden
                          ? "cursor-pointer bg-slate-50/80 text-slate-500"
                          : "cursor-pointer text-slate-700 hover:bg-slate-50"
                    }
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {item.jobId ?? item.id}
                      {hidden ? (
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-sans uppercase tracking-wide text-slate-600">
                          hidden
                        </span>
                      ) : null}
                    </td>
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
                    <td className="px-4 py-3">{statusLabel(item.status)}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {item.status === "finished" ? (
                        <span className="flex gap-2">
                          <a
                            href={`/api/files/${encodeURIComponent(item.personSlug)}/${encodeURIComponent(item.companySlug)}/${encodeURIComponent(item.roleSlug)}/resume`}
                            className="text-sky-700 hover:underline"
                          >
                            Resume
                          </a>
                          <a
                            href={`/api/files/${encodeURIComponent(item.personSlug)}/${encodeURIComponent(item.companySlug)}/${encodeURIComponent(item.roleSlug)}/cover-letter`}
                            className="text-sky-700 hover:underline"
                          >
                            Cover
                          </a>
                        </span>
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
                      {!hidden ? (
                        <JobHideButton
                          jobId={item.id}
                          status={item.status}
                          onHidden={() => onJobHidden(item.id)}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <JobRunViewer job={selected} />
    </div>
  );
}
