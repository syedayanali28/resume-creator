"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { pdfApiUrl, pdfViewerPageUrl } from "@/lib/pdf-files";

type PdfLinks = {
  hasResume: boolean;
  hasCover: boolean;
  resumeDownloadUrl: string | null;
  coverDownloadUrl: string | null;
};

type Props = {
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  showMissingHint?: boolean;
  compact?: boolean;
  /** Pull PDFs from GitHub into Vercel Blob when missing (for remote / finished jobs). */
  syncToBlobIfMissing?: boolean;
};

export function JobPdfDownloads({
  personSlug,
  companySlug,
  roleSlug,
  showMissingHint = true,
  compact = false,
  syncToBlobIfMissing = false,
}: Props) {
  const [links, setLinks] = useState<PdfLinks | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncAttempted = useRef(false);

  const loadLinks = useCallback(async (signal?: AbortSignal) => {
    const res = await fetch(
      `/api/files/${encodeURIComponent(personSlug)}/${encodeURIComponent(companySlug)}/${encodeURIComponent(roleSlug)}`,
      { signal },
    );
    if (!res.ok) return null;
    return (await res.json()) as PdfLinks;
  }, [personSlug, companySlug, roleSlug]);

  const runBlobSync = useCallback(async (): Promise<PdfLinks | null> => {
    const res = await fetch(
      `/api/files/${encodeURIComponent(personSlug)}/${encodeURIComponent(companySlug)}/${encodeURIComponent(roleSlug)}/sync`,
      { method: "POST" },
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error ?? `Sync failed (${res.status})`);
    }
    const data = (await res.json()) as PdfLinks & { uploaded?: { resume: boolean; cover: boolean } };
    return {
      hasResume: data.hasResume,
      hasCover: data.hasCover,
      resumeDownloadUrl: data.resumeDownloadUrl,
      coverDownloadUrl: data.coverDownloadUrl,
    };
  }, [personSlug, companySlug, roleSlug]);

  useEffect(() => {
    const ac = new AbortController();
    syncAttempted.current = false;
    setLoading(true);
    setSyncError(null);

    void (async () => {
      try {
        let data = await loadLinks(ac.signal);
        if (
          syncToBlobIfMissing &&
          data &&
          !data.hasResume &&
          !data.hasCover &&
          !syncAttempted.current
        ) {
          syncAttempted.current = true;
          setSyncing(true);
          try {
            data = await runBlobSync();
          } catch (e) {
            if (!ac.signal.aborted) {
              setSyncError(e instanceof Error ? e.message : "Could not sync PDFs to Blob.");
            }
          } finally {
            if (!ac.signal.aborted) setSyncing(false);
          }
        }
        if (!ac.signal.aborted) setLinks(data);
      } catch {
        if (!ac.signal.aborted) setLinks(null);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [personSlug, companySlug, roleSlug, syncToBlobIfMissing, loadLinks, runBlobSync]);

  const resumeHref =
    links?.resumeDownloadUrl ?? pdfApiUrl(personSlug, companySlug, roleSlug, "resume");
  const coverHref =
    links?.coverDownloadUrl ?? pdfApiUrl(personSlug, companySlug, roleSlug, "cover-letter");

  if (loading || syncing) {
    return (
      <span className="text-xs text-slate-400">{syncing ? "Syncing PDFs…" : "…"}</span>
    );
  }

  const hasResume = links?.hasResume ?? false;
  const hasCover = links?.hasCover ?? false;

  if (!hasResume && !hasCover) {
    if (!showMissingHint) return <span className="text-xs text-slate-400">—</span>;
    return (
      <span className="text-xs text-slate-500">
        {syncError ?? "PDFs not ready"}
        {syncToBlobIfMissing ? (
          <button
            type="button"
            className="ml-2 text-sky-700 hover:underline"
            onClick={() => {
              setSyncing(true);
              setSyncError(null);
              void runBlobSync()
                .then((data) => setLinks(data))
                .catch((e) =>
                  setSyncError(e instanceof Error ? e.message : "Sync failed."),
                )
                .finally(() => setSyncing(false));
            }}
          >
            Retry sync
          </button>
        ) : null}
      </span>
    );
  }

  const linkClass = compact
    ? "text-sky-700 hover:underline"
    : "inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm hover:border-sky-200 hover:bg-sky-50/80";

  return (
    <span className="flex flex-wrap items-center gap-2">
      {hasResume ? (
        <a href={resumeHref} download className={linkClass}>
          {compact ? "Resume" : "Download resume"}
        </a>
      ) : null}
      {hasCover ? (
        <a href={coverHref} download className={linkClass}>
          {compact ? "Cover" : "Download cover"}
        </a>
      ) : null}
      {!compact && hasResume ? (
        <Link
          href={pdfViewerPageUrl(personSlug, companySlug, roleSlug, "resume")}
          className="text-xs text-slate-500 hover:text-sky-700 hover:underline"
        >
          View resume
        </Link>
      ) : null}
      {!compact && hasCover ? (
        <Link
          href={pdfViewerPageUrl(personSlug, companySlug, roleSlug, "cover-letter")}
          className="text-xs text-slate-500 hover:text-sky-700 hover:underline"
        >
          View cover
        </Link>
      ) : null}
    </span>
  );
}
