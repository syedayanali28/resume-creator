"use client";

import { JobSearchBar } from "@/components/tailor-queue/job-search-bar";
import { enqueueTailorJob, inferJobFolderSlugs } from "@/lib/enqueue-tailor-job";
import { normalizeJobPostingUrl } from "@/lib/job-from-url";
import { filterTailorQueueJobs } from "@/lib/tailor-queue-search";
import { useTailorQueue, type TailorQueueRow } from "@/lib/use-tailor-queue";
import { useMemo, useState } from "react";

type PersonOption = { slug: string };

function parseUrls(text: string): string[] {
  const found = new Set<string>();
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  for (const m of text.matchAll(re)) {
    try {
      const u = new URL(m[0]);
      if (u.protocol === "http:" || u.protocol === "https:") {
        found.add(normalizeJobPostingUrl(u.toString()));
      }
    } catch {
      /* skip */
    }
  }
  return [...found];
}

function statusLabel(job: TailorQueueRow): string {
  if (job.id.startsWith("packet-")) return "On server";
  if (job.status === "queued") return "Waiting";
  if (job.status === "running") return "Running";
  if (job.status === "finished") return "Done";
  return "Failed";
}

export function AddJobForm({ people }: { people: PersonOption[] }) {
  const defaultSlug =
    people.find((p) => p.slug === "Zhao-Yanbo")?.slug ?? people[0]?.slug ?? "";
  const [personSlug, setPersonSlug] = useState(defaultSlug);
  const [draft, setDraft] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState<TailorQueueRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { items: serverJobs, error: queueError, refresh } = useTailorQueue();

  async function enqueueOne(url: string, optimisticId: string) {
    const slugs = await inferJobFolderSlugs(url);
    const result = await enqueueTailorJob({
      personSlug,
      jobPostingUrl: url,
      companySlug: slugs.companySlug,
      roleSlug: slugs.roleSlug,
    });

    setPending((prev) => prev.filter((j) => j.id !== optimisticId));

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setFormError(null);
    await refresh(true);
  }

  function addUrlsToList(urls: string[]) {
    if (!personSlug || urls.length === 0) return;
    setFormError(null);

    const optimistic: TailorQueueRow[] = urls.map((url) => ({
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      personSlug,
      companySlug: "…",
      roleSlug: "…",
      jobPostingUrl: url,
      status: "queued",
    }));

    setPending((prev) => [...optimistic, ...prev]);

    for (const row of optimistic) {
      void enqueueOne(row.jobPostingUrl, row.id);
    }
  }

  function onGo() {
    const urls = parseUrls(draft);
    if (urls.length === 0) {
      setFormError("Paste a job link first.");
      return;
    }
    addUrlsToList(urls);
    setDraft("");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData("text") || e.dataTransfer.getData("text/plain");
    const urls = parseUrls(text);
    if (urls.length > 0) addUrlsToList(urls);
    else if (text.trim()) setDraft((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
  }

  const forPerson = useMemo(() => {
    const serverForPerson = serverJobs.filter((j) => j.personSlug === personSlug);
    const pendingForPerson = pending.filter((j) => j.personSlug === personSlug);
    const serverByUrl = new Set(serverForPerson.map((j) => j.jobPostingUrl));
    const rows = [
      ...serverForPerson,
      ...pendingForPerson.filter((p) => !serverByUrl.has(p.jobPostingUrl)),
    ];
    return rows.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [pending, serverJobs, personSlug]);

  const visible = useMemo(
    () => filterTailorQueueJobs(forPerson, { query: searchQuery }),
    [forPerson, searchQuery],
  );

  const displayError = formError ?? queueError;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Add job</h1>

      <label className="block">
        <span className="text-sm text-slate-600">Person</span>
        <select
          value={personSlug}
          onChange={(e) => setPersonSlug(e.target.value)}
          className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {people.length === 0 ? (
            <option value="">No people</option>
          ) : (
            people.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.slug.replaceAll("-", " ")}
              </option>
            ))
          )}
        </select>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={
          dragOver
            ? "rounded-lg border-2 border-dashed border-sky-500 bg-sky-50 p-4"
            : "rounded-lg border-2 border-dashed border-slate-300 bg-white p-4"
        }
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste LinkedIn job links (one or many)…"
          rows={3}
          className="w-full resize-y border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      <button
        type="button"
        disabled={!personSlug}
        onClick={onGo}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        Go
      </button>

      {displayError ? <p className="text-sm text-red-600">{displayError}</p> : null}

      <div>
        <h2 className="text-sm font-medium text-slate-700">Queue</h2>
        <div className="mt-2">
          <JobSearchBar
            inputId="add-job-search"
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={visible.length}
            totalCount={forPerson.length}
          />
        </div>
        {visible.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            {searchQuery.trim() ? "No jobs match your search." : "No links yet."}
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {visible.map((job) => (
              <li key={job.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-slate-400">{job.jobId ?? job.id}</p>
                    <a
                      href={job.jobPostingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block truncate text-sky-800 hover:underline"
                    >
                      {job.jobPostingUrl}
                    </a>
                  </div>
                  <span className="shrink-0 text-slate-500">{statusLabel(job)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {job.companySlug} / {job.roleSlug}
                </p>
                {job.error ? <p className="mt-1 text-xs text-red-600">{job.error}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
