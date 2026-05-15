"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type PersonOption = { slug: string; companyCount: number; roleCount: number };

type ApplicationRow = { companySlug: string; roleSlug: string };

type ApiTailorResponse = {
  ok?: boolean;
  status?: string;
  runId?: string;
  summary?: string | null;
  durationMs?: number | null;
  prUrl?: string | null;
  git?: unknown;
  runtime?: string;
  error?: string;
  code?: string;
  isRetryable?: boolean;
};

/** Selecting an existing saved packet vs a new folder derived from the posting URL. */
const NEW_APPLICATION = "__new__";
const DEFAULT_MODEL_ID = "composer-2";
const MODEL_PRESETS = [DEFAULT_MODEL_ID, "composer-2-fast", "auto"];
const MODEL_CUSTOM = "__custom__";

type StreamLine = {
  ts: string;
  kind: "status" | "thinking" | "assistant" | "tool" | "meta" | "error";
  text: string;
};

type QueueJobStatus = "queued" | "running" | "finished" | "error";

type QueueJob = {
  id: string;
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
  modelId: string;
  status: QueueJobStatus;
  createdAt?: string;
  updatedAt?: string;
  runId?: string;
  error?: string;
  redirectTo?: string;
};

type StreamEvent =
  | { type: "status"; status: string }
  | { type: "thinking"; message: string }
  | { type: "assistant"; text: string }
  | { type: "tool_call"; name: string; status: string }
  | {
      type: "meta";
      runtime: "local" | "cloud";
      agentId: string;
      runId?: string;
      modelId?: string;
    }
  | {
      type: "result";
      ok: boolean;
      status: string;
      runId: string;
      summary: string | null;
      durationMs: number | null;
      prUrl: string | null;
      redirectTo: string;
    }
  | { type: "error"; error: string; code?: string; isRetryable?: boolean };

type JobPreviewResponse = {
  companySlug?: string;
  roleSlug?: string;
  source?: string;
  titleRaw?: string | null;
  fetchOk?: boolean;
  error?: string;
};

export function CursorTailorForm({ people }: { people: PersonOption[] }) {
  const defaultPersonSlug =
    people.find((p) => p.slug === "Zhao-Yanbo")?.slug ?? people[0]?.slug ?? "";
  const [personSlug, setPersonSlug] = useState(defaultPersonSlug);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [applicationKey, setApplicationKey] = useState(NEW_APPLICATION);
  const [companySlug, setCompanySlug] = useState("");
  const [roleSlug, setRoleSlug] = useState("");
  const [jobPostingUrl, setJobPostingUrl] = useState("");
  const [modelPreset, setModelPreset] = useState(DEFAULT_MODEL_ID);
  const [customModelId, setCustomModelId] = useState("");
  const [queueUrlInput, setQueueUrlInput] = useState("");
  const [queueJobs, setQueueJobs] = useState<QueueJob[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingSlugPreview, setLoadingSlugPreview] = useState(false);
  const [slugHint, setSlugHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ApiTailorResponse | null>(null);
  const [streamLines, setStreamLines] = useState<StreamLine[]>([]);
  const [redirectingTo, setRedirectingTo] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const selectedModelId =
    modelPreset === MODEL_CUSTOM ? customModelId.trim() || DEFAULT_MODEL_ID : modelPreset;
  const queueRunning = queueJobs.some((j) => j.status === "running");

  const applicationOptions = useMemo(() => {
    return applications.map((a) => ({
      key: `${a.companySlug}/${a.roleSlug}`,
      label: `${a.companySlug} / ${a.roleSlug}`,
      ...a,
    }));
  }, [applications]);

  const loadApplications = useCallback(async (slug: string) => {
    if (!slug) {
      setApplications([]);
      return;
    }
    setLoadingRoles(true);
    setClientError(null);
    try {
      const res = await fetch(`/api/person/${encodeURIComponent(slug)}/roles`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        applications?: ApplicationRow[];
        error?: string;
      };
      if (!res.ok) {
        setApplications([]);
        setClientError(data.error ?? `Failed to load roles (${res.status})`);
        return;
      }
      const rows = data.applications ?? [];
      setApplications(rows);
      setApplicationKey(NEW_APPLICATION);
      setCompanySlug("");
      setRoleSlug("");
      setSlugHint(null);
    } catch {
      setApplications([]);
      setClientError("Network error loading applications.");
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    if (personSlug) void loadApplications(personSlug);
  }, [personSlug, loadApplications]);

  useEffect(() => {
    if (applicationKey === NEW_APPLICATION) return;
    const opt = applicationOptions.find((o) => o.key === applicationKey);
    if (opt) {
      setCompanySlug(opt.companySlug);
      setRoleSlug(opt.roleSlug);
      setSlugHint(null);
    }
  }, [applicationKey, applicationOptions]);

  useEffect(() => {
    if (applicationKey !== NEW_APPLICATION) {
      setSlugHint(null);
    }
  }, [applicationKey]);

  useEffect(() => {
    const raw = jobPostingUrl.trim();
    if (!raw) {
      setSlugHint(null);
      setCompanySlug("");
      setRoleSlug("");
      setApplicationKey(NEW_APPLICATION);
      return;
    }

    let urlOk = false;
    try {
      const u = new URL(raw);
      urlOk = u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return;
    }
    if (!urlOk) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setApplicationKey(NEW_APPLICATION);
      setLoadingSlugPreview(true);
      setClientError(null);
      try {
        const res = await fetch("/api/job-link-preview", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobUrl: raw }),
        });
        const data = (await res.json()) as JobPreviewResponse;
        if (cancelled) return;
        if (!res.ok) {
          setClientError(data.error ?? `Could not preview job link (${res.status})`);
          setSlugHint(null);
          return;
        }
        if (data.companySlug && data.roleSlug) {
          setCompanySlug(data.companySlug);
          setRoleSlug(data.roleSlug);
        }
        const parts: string[] = [];
        if (data.source === "page-title") {
          parts.push("Company and role names were inferred from the posting page title.");
        } else if (data.source === "linkedin-job-id") {
          parts.push(
            "Posting page did not expose a title (common for LinkedIn). Folder names use the job id from the URL.",
          );
        } else {
          parts.push("Folder names were inferred from the site hostname (title was not usable).");
        }
        if (data.titleRaw) {
          parts.push(`Page title: ${data.titleRaw}`);
        }
        if (data.fetchOk === false && data.source !== "page-title") {
          parts.push("The server could not fetch the page HTML; you can still edit the slugs below.");
        }
        setSlugHint(parts.join(" "));
      } catch {
        if (!cancelled) {
          setClientError("Network error while inferring folder names from the posting URL.");
          setSlugHint(null);
        }
      } finally {
        if (!cancelled) setLoadingSlugPreview(false);
      }
    }, 550);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [jobPostingUrl, personSlug]);

  async function refreshRemoteQueue() {
    if (!personSlug) return;
    setLoadingQueue(true);
    try {
      const res = await fetch(`/api/cursor-tailor/queue?person=${encodeURIComponent(personSlug)}`, {
        credentials: "same-origin",
      });
      const data = (await res.json()) as { items?: QueueJob[]; error?: string };
      if (!res.ok) {
        setClientError(data.error ?? `Queue fetch failed (${res.status})`);
        return;
      }
      const items = (data.items ?? []).map((x) => ({
        ...x,
        redirectTo:
          x.status === "finished"
            ? `/person/${encodeURIComponent(x.personSlug)}?company=${encodeURIComponent(x.companySlug)}&role=${encodeURIComponent(x.roleSlug)}`
            : x.redirectTo,
      }));
      setQueueJobs(items);
    } catch {
      setClientError("Network error while loading remote queue.");
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => {
    void refreshRemoteQueue();
    const timer = window.setInterval(() => {
      void refreshRemoteQueue();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [personSlug]);

  function appendLine(kind: StreamLine["kind"], text: string) {
    const ts = new Date().toLocaleTimeString();
    setStreamLines((prev) => [...prev, { ts, kind, text }]);
  }

  async function readJsonError(res: Response): Promise<string> {
    try {
      const data = (await res.json()) as { error?: string };
      return data.error ?? `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  }

  function consumeStreamEvent(ev: StreamEvent, opts?: { redirectOnSuccess?: boolean; prefix?: string }) {
    const prefix = opts?.prefix ? `${opts.prefix} ` : "";
    if (ev.type === "meta") {
      appendLine(
        "meta",
        `${prefix}${
          ev.runId
            ? `Run started: ${ev.runId}${ev.modelId ? ` | model=${ev.modelId}` : ""}`
            : `Agent created: ${ev.agentId}${ev.modelId ? ` | model=${ev.modelId}` : ""}`
        }`,
      );
      if (ev.runId) {
        setResult((prev) => ({ ...(prev ?? {}), runId: ev.runId, runtime: ev.runtime }));
      }
      return;
    }
    if (ev.type === "status") {
      appendLine("status", `${prefix}Status: ${ev.status}`);
      setResult((prev) => ({ ...(prev ?? {}), status: ev.status }));
      return;
    }
    if (ev.type === "thinking") {
      appendLine("thinking", `${prefix}${ev.message}`);
      return;
    }
    if (ev.type === "tool_call") {
      appendLine("tool", `${prefix}${ev.name}: ${ev.status}`);
      return;
    }
    if (ev.type === "assistant") {
      appendLine("assistant", `${prefix}${ev.text}`);
      return;
    }
    if (ev.type === "error") {
      appendLine("error", `${prefix}${ev.error}`);
      setClientError(ev.error);
      return;
    }
    if (ev.type === "result") {
      appendLine("meta", `${prefix}Run completed with status: ${ev.status}`);
      setResult({
        ok: ev.ok,
        status: ev.status,
        runId: ev.runId,
        summary: ev.summary,
        durationMs: ev.durationMs,
        prUrl: ev.prUrl,
      });
      if (ev.ok && opts?.redirectOnSuccess !== false) {
        setRedirectingTo(ev.redirectTo);
        window.setTimeout(() => {
          window.location.href = ev.redirectTo;
        }, 900);
      }
    }
  }

  async function runStream(payload: {
    personSlug: string;
    companySlug: string;
    roleSlug: string;
    jobPostingUrl: string;
    modelId: string;
  }, opts?: { redirectOnSuccess?: boolean; prefix?: string }): Promise<{
    ok: boolean;
    runId?: string;
    redirectTo?: string;
    error?: string;
  }> {
    let finalOutcome: { ok: boolean; runId?: string; redirectTo?: string; error?: string } = {
      ok: false,
    };

    const consume = (ev: StreamEvent) => {
      consumeStreamEvent(ev, opts);
      if (ev.type === "result") {
        finalOutcome = { ok: ev.ok, runId: ev.runId, redirectTo: ev.redirectTo };
      } else if (ev.type === "error") {
        finalOutcome = { ok: false, error: ev.error };
      }
    };

    const res = await fetch("/api/cursor-tailor/stream", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await readJsonError(res);
      setClientError(msg);
      appendLine("error", `${opts?.prefix ? `${opts.prefix} ` : ""}${msg}`);
      return { ok: false, error: msg };
    }
    if (!res.body) {
      const msg = "Streaming response body was empty.";
      setClientError(msg);
      appendLine("error", `${opts?.prefix ? `${opts.prefix} ` : ""}${msg}`);
      return { ok: false, error: msg };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const ev = JSON.parse(trimmed) as StreamEvent;
          consume(ev);
        } catch {
          appendLine(
            "error",
            `${opts?.prefix ? `${opts.prefix} ` : ""}Received malformed stream event.`,
          );
        }
      }
    }

    if (buffer.trim()) {
      try {
        const ev = JSON.parse(buffer) as StreamEvent;
        consume(ev);
      } catch {
        appendLine(
          "error",
          `${opts?.prefix ? `${opts.prefix} ` : ""}Received malformed final stream chunk.`,
        );
      }
    }
    return finalOutcome;
  }

  function queueLabel(job: Pick<QueueJob, "companySlug" | "roleSlug">): string {
    return `${job.companySlug}/${job.roleSlug}`;
  }

  async function inferJobSlugs(rawUrl: string): Promise<{ companySlug: string; roleSlug: string }> {
    try {
      const res = await fetch("/api/job-link-preview", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobUrl: rawUrl }),
      });
      const data = (await res.json()) as JobPreviewResponse;
      if (res.ok && data.companySlug && data.roleSlug) {
        return { companySlug: data.companySlug, roleSlug: data.roleSlug };
      }
    } catch {
      // fallback below
    }
    return {
      companySlug: companySlug.trim() || "Company",
      roleSlug: roleSlug.trim() || "Role",
    };
  }

  async function addCurrentOrInputToQueue() {
    const rawUrl = (queueUrlInput.trim() || jobPostingUrl.trim()).trim();
    if (!rawUrl) {
      setClientError("Paste a job posting URL first.");
      return;
    }
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      setClientError("Invalid queue URL.");
      return;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      setClientError("Queue URL must be http(s).");
      return;
    }
    setClientError(null);
    const inferred = await inferJobSlugs(rawUrl);
    const res = await fetch("/api/cursor-tailor/queue", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        personSlug,
        companySlug: inferred.companySlug,
        roleSlug: inferred.roleSlug,
        jobPostingUrl: rawUrl,
        modelId: selectedModelId,
      }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      setClientError(data.error ?? `Queue enqueue failed (${res.status})`);
      return;
    }
    setQueueUrlInput("");
    appendLine("meta", `Queued remotely: ${inferred.companySlug}/${inferred.roleSlug}`);
    await refreshRemoteQueue();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setStreamLines([]);
    setRedirectingTo(null);
    setClientError(null);
    try {
      appendLine("meta", "Starting stream...");
      await runStream({
        personSlug,
        companySlug: companySlug.trim(),
        roleSlug: roleSlug.trim(),
        jobPostingUrl: jobPostingUrl.trim(),
        modelId: selectedModelId,
      });
    } catch {
      setClientError("Network error while starting the agent.");
      appendLine("error", "Network error while starting the agent.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white to-slate-50/90 p-8 shadow-lg shadow-slate-200/60 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600/90">
          Cursor SDK
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          AI tailor (remote agent)
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Paste a job posting URL to start a{" "}
          <strong className="font-semibold text-slate-800">new application</strong>: company and role
          folder names are suggested from the link (and from the page title when the server can read
          it). Pick a saved packet from the dropdown only if you want to reuse an existing folder. Then
          run a Cursor agent on{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
            people/&lt;Person&gt;/&lt;Company&gt;/&lt;Role&gt;/
          </code>
          with your selected model (default{" "}
          <strong className="font-semibold text-slate-800">{DEFAULT_MODEL_ID}</strong>). By default
          the agent runs in the{" "}
          <strong className="font-semibold text-slate-800">cloud</strong> against the Git
          repository you configure with{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">CURSOR_CLOUD_REPO_URL</code>
          . Set{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs">
            CURSOR_TAILOR_RUNTIME=local
          </code>{" "}
          on the server to run against the checkout next to this app instead.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-500 sm:text-sm">
          Queue items are dispatched to a remote worker and continue in order even if you leave this
          page. Progress and completion states appear in each person profile dashboard.
        </p>
      </section>

      <form
        onSubmit={onSubmit}
        className="space-y-6 rounded-3xl border border-white/90 bg-white p-8 shadow-md shadow-slate-200/50 sm:p-10"
      >
        <div className="grid gap-6 sm:grid-cols-3">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Profile (person)</span>
            <select
              value={personSlug}
              onChange={(e) => setPersonSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
              required
            >
              {people.length === 0 ? (
                <option value="">No people found</option>
              ) : (
                people.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.slug.replaceAll("-", " ")} ({p.roleCount} roles)
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Application packet</span>
            <select
              value={applicationKey}
              onChange={(e) => setApplicationKey(e.target.value)}
              disabled={loadingRoles}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value={NEW_APPLICATION}>New application (from posting URL)</option>
              {applicationOptions.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Pasting or editing the job URL switches back to a new application and refreshes suggested
              folder names.
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Model</span>
            <select
              value={modelPreset}
              onChange={(e) => setModelPreset(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
            >
              {MODEL_PRESETS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={MODEL_CUSTOM}>Custom model id…</option>
            </select>
            {modelPreset === MODEL_CUSTOM ? (
              <input
                value={customModelId}
                onChange={(e) => setCustomModelId(e.target.value)}
                placeholder="e.g. gpt-5.5-medium"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
              />
            ) : null}
            <span className="text-xs text-slate-500">Current: {selectedModelId}</span>
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Job posting URL</span>
          <input
            type="url"
            value={jobPostingUrl}
            onChange={(e) => setJobPostingUrl(e.target.value)}
            placeholder="https://www.linkedin.com/jobs/view/… or company careers URL"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
            required
          />
          <span className="text-xs text-slate-500">
            First line of{" "}
            <code className="rounded bg-slate-100 px-1">job link.txt</code> and used to suggest{" "}
            <code className="rounded bg-slate-100 px-1">Company</code> /{" "}
            <code className="rounded bg-slate-100 px-1">Role</code> folder slugs.
            {loadingSlugPreview ? (
              <span className="ml-1 font-medium text-sky-700">Updating slugs…</span>
            ) : null}
          </span>
          {slugHint ? (
            <p className="rounded-lg border border-sky-100 bg-sky-50/80 px-3 py-2 text-xs leading-relaxed text-slate-700">
              {slugHint}
            </p>
          ) : null}
        </label>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-800">Queue multiple job links</p>
          <p className="mt-1 text-xs text-slate-600">
            Paste URLs one by one and click Add. Jobs run sequentially in queue order with the
            selected person/model snapshot captured at add time.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              value={queueUrlInput}
              onChange={(e) => setQueueUrlInput(e.target.value)}
              placeholder="Paste another job URL and click Add to queue"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => {
                void addCurrentOrInputToQueue();
              }}
              disabled={!personSlug || queueRunning}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:border-sky-200 hover:bg-sky-50/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to queue
            </button>
            <button
              type="button"
              onClick={() => {
                void refreshRemoteQueue();
              }}
              disabled={loadingQueue}
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingQueue ? "Refreshing..." : "Refresh queue"}
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xs text-slate-500">
              Queued {queueJobs.filter((j) => j.status === "queued").length} · Running{" "}
              {queueJobs.filter((j) => j.status === "running").length} · Done{" "}
              {queueJobs.filter((j) => j.status === "finished").length}
            </p>
          </div>
          {queueJobs.length > 0 ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
              <div className="max-h-56 overflow-auto">
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Packet</th>
                      <th className="px-3 py-2">Person</th>
                      <th className="px-3 py-2">Model</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueJobs.map((job) => (
                      <tr key={job.id} className="border-t border-slate-100 text-slate-700">
                        <td className="px-3 py-2">
                          {job.status === "queued"
                            ? "Queued"
                            : job.status === "running"
                              ? "Running"
                              : job.status === "finished"
                                ? "Done"
                                : "Error"}
                        </td>
                        <td className="px-3 py-2">
                          {job.companySlug}/{job.roleSlug}
                        </td>
                        <td className="px-3 py-2">{job.personSlug}</td>
                        <td className="px-3 py-2">{job.modelId}</td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {job.redirectTo ? (
                              <a
                                href={job.redirectTo}
                                className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                              >
                                Open
                              </a>
                            ) : null}
                            {job.error ? (
                              <span className="text-rose-700">{job.error}</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Company folder slug</span>
            <input
              value={companySlug}
              onChange={(e) => setCompanySlug(e.target.value)}
              placeholder="e.g. HSBC"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
              required
              pattern="[A-Za-z0-9][A-Za-z0-9_.-]*"
              title="Letters, numbers, dot, hyphen, underscore; must start with alphanumeric"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-800">Role folder slug</span>
            <input
              value={roleSlug}
              onChange={(e) => setRoleSlug(e.target.value)}
              placeholder="e.g. Analyst-GFX-Middle-Office"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none ring-sky-500/30 focus:border-sky-300 focus:ring-2"
              required
              pattern="[A-Za-z0-9][A-Za-z0-9_.-]*"
              title="Letters, numbers, dot, hyphen, underscore; must start with alphanumeric"
            />
          </label>
        </div>

        {clientError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {clientError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting || queueRunning || !personSlug || people.length === 0 || !selectedModelId}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-sky-900/20 transition hover:from-sky-500 hover:to-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Running agent…" : `Run Cursor agent (${selectedModelId})`}
        </button>
      </form>

      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-inner shadow-slate-100 sm:p-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Live run stream</h2>
          {redirectingTo ? (
            <p className="text-xs font-medium text-sky-700">Redirecting to generated packet...</p>
          ) : null}
        </div>
        <div className="mt-4 max-h-[min(24rem,52vh)] overflow-auto rounded-xl border border-slate-100 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-100">
          {streamLines.length === 0 ? (
            <p className="text-slate-400">No stream yet. Start a run to see live output.</p>
          ) : (
            streamLines.map((line, idx) => (
              <p key={`${line.ts}-${idx}`} className="whitespace-pre-wrap break-words">
                <span className="text-slate-500">[{line.ts}]</span>{" "}
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
                            : line.kind === "meta"
                              ? "text-emerald-300"
                              : "text-slate-100"
                  }
                >
                  {line.text}
                </span>
              </p>
            ))
          )}
        </div>
      </section>

      {result ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-inner shadow-slate-100 sm:p-10">
          <h2 className="text-lg font-semibold text-slate-900">Result</h2>
          <dl className="mt-4 space-y-2 text-sm text-slate-700">
            <div className="flex flex-wrap gap-2">
              <dt className="font-medium text-slate-500">Status</dt>
              <dd>{result.status ?? "unknown"}</dd>
            </div>
            {result.runId ? (
              <div className="flex flex-wrap gap-2">
                <dt className="font-medium text-slate-500">Run id</dt>
                <dd className="font-mono text-xs">{result.runId}</dd>
              </div>
            ) : null}
            {result.runtime ? (
              <div className="flex flex-wrap gap-2">
                <dt className="font-medium text-slate-500">Runtime</dt>
                <dd>{result.runtime}</dd>
              </div>
            ) : null}
            {result.prUrl ? (
              <div className="flex flex-col gap-1">
                <dt className="font-medium text-slate-500">Pull request</dt>
                <dd>
                  <a
                    href={result.prUrl}
                    className="text-sky-700 underline decoration-sky-300 underline-offset-2 hover:text-sky-900"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {result.prUrl}
                  </a>
                </dd>
              </div>
            ) : null}
            {result.durationMs != null ? (
              <div className="flex flex-wrap gap-2">
                <dt className="font-medium text-slate-500">Duration</dt>
                <dd>{(result.durationMs / 1000).toFixed(1)}s</dd>
              </div>
            ) : null}
          </dl>
          {result.summary ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-800">Agent summary</h3>
              <pre className="mt-2 max-h-[min(24rem,50vh)] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs leading-relaxed text-slate-800">
                {result.summary}
              </pre>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
