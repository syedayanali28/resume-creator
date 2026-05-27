import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { buildTailorPrompt } from "@/lib/build-tailor-prompt";
import { createCloudTailorAgent } from "@/lib/cursor-cloud-agent";
import { useLocalTailorRuntime } from "@/lib/cursor-tailor-runtime";
import { normalizeJobPostingUrl } from "@/lib/job-from-url";
import { assertSafePathSegment, getPeopleRoot } from "@/lib/paths";
import { publishRolePdfsAfterRun } from "@/lib/publish-role-pdfs";

export type TailorQueueStatus = "queued" | "running" | "finished" | "error";

export type TailorQueueItem = {
  id: string;
  /** Short id shown in UI (e.g. J-a1b2c3d4). */
  jobId: string;
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
  modelId: string;
  status: TailorQueueStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  finishedAt?: string;
  agentId?: string;
  runId?: string;
  summary?: string | null;
  durationMs?: number | null;
  error?: string;
  /** Set when the user hides a job from default lists; still searchable in History. */
  hiddenAt?: string;
};

function queueStoreDir(): string {
  if (process.env.VERCEL === "1") {
    return path.join(os.tmpdir(), "resume-creator");
  }
  return path.resolve(process.cwd(), ".runtime");
}

const STORE_DIR = queueStoreDir();
const STORE_FILE = path.join(STORE_DIR, "tailor-queue.json");

function nowIso(): string {
  return new Date().toISOString();
}

function createJobId(): string {
  return `J-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeQueueItem(raw: TailorQueueItem): TailorQueueItem {
  const jobId =
    typeof raw.jobId === "string" && raw.jobId.trim()
      ? raw.jobId.trim()
      : `J-${raw.id.slice(0, 8)}`;
  return { ...raw, jobId };
}

async function readAll(): Promise<TailorQueueItem[]> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as TailorQueueItem[];
    return Array.isArray(parsed) ? parsed.map(normalizeQueueItem) : [];
  } catch {
    return [];
  }
}

export async function getTailorQueueItem(ref: string): Promise<TailorQueueItem | null> {
  const key = ref.trim();
  if (!key) return null;
  const items = await readAll();
  return items.find((x) => x.id === key || x.jobId === key) ?? null;
}

async function writeAll(items: TailorQueueItem[]): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(items, null, 2), "utf8");
}

function normalizeModelId(modelId: string): string {
  const m = modelId.trim();
  return m.length > 0 ? m : "composer-2";
}

function getRepoRoot(): string {
  return path.resolve(getPeopleRoot(), "..");
}

function agentRuntime(): "local" | "cloud" {
  return useLocalTailorRuntime() ? "local" : "cloud";
}

function findQueueItemIndex(items: TailorQueueItem[], ref: string): number {
  const key = ref.trim();
  return items.findIndex((x) => x.id === key || x.jobId === key);
}

async function saveUpdatedItem(
  ref: string,
  updater: (item: TailorQueueItem) => TailorQueueItem,
): Promise<boolean> {
  const items = await readAll();
  const idx = findQueueItemIndex(items, ref);
  if (idx < 0) return false;
  items[idx] = updater(items[idx]!);
  await writeAll(items);
  return true;
}

type AgentRunResult = {
  status: string;
  result?: string | null;
  durationMs?: number | null;
};

async function finishRunOnItem(item: TailorQueueItem, result: AgentRunResult): Promise<void> {
  await saveUpdatedItem(item.id, (curr) => ({
    ...curr,
    status: result.status === "finished" ? "finished" : "error",
    updatedAt: nowIso(),
    finishedAt: nowIso(),
    summary: result.result ?? null,
    durationMs: result.durationMs ?? null,
    error: result.status === "finished" ? undefined : `Run ended with status: ${result.status}`,
  }));

  if (result.status === "finished") {
    void publishRolePdfsAfterRun(item.personSlug, item.companySlug, item.roleSlug);
  }
}

async function refreshRunStatus(item: TailorQueueItem, apiKey: string): Promise<void> {
  if (!item.agentId || !item.runId || item.status !== "running") return;
  try {
    const run = await Agent.getRun(item.runId, {
      runtime: agentRuntime(),
      agentId: item.agentId,
      apiKey,
    });
    if (run.status === "running") return;
    const result = await run.wait();
    await finishRunOnItem(item, result);
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to refresh run status";
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      error: message,
    }));
  }
}

async function startQueuedItem(item: TailorQueueItem, apiKey: string): Promise<void> {
  const useLocal = useLocalTailorRuntime();
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  if (!useLocal && !repoUrl) {
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      error:
        "Set CURSOR_CLOUD_REPO_URL for cloud runs, or CURSOR_TAILOR_RUNTIME=local for local runs.",
    }));
    return;
  }

  const prompt = buildTailorPrompt({
    personSlug: item.personSlug,
    companySlug: item.companySlug,
    roleSlug: item.roleSlug,
    jobPostingUrl: item.jobPostingUrl,
  });

  await saveUpdatedItem(item.id, (curr) => ({
    ...curr,
    status: "running",
    updatedAt: nowIso(),
    startedAt: curr.startedAt ?? nowIso(),
    error: undefined,
  }));

  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;
  try {
    agent = useLocal
      ? await Agent.create({
          apiKey,
          model: { id: normalizeModelId(item.modelId) },
          local: { cwd: getRepoRoot() },
        })
      : await createCloudTailorAgent(apiKey, item.modelId);
    const run = await agent.send(prompt);

    if (useLocal) {
      await saveUpdatedItem(item.id, (curr) => ({
        ...curr,
        updatedAt: nowIso(),
        status: "running",
        agentId: agent?.agentId,
        runId: run.id,
      }));
      const result = await run.wait();
      await finishRunOnItem(item, result);
      return;
    }

    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      updatedAt: nowIso(),
      status: "running",
      agentId: agent?.agentId,
      runId: run.id,
      error: undefined,
    }));
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to start remote run";
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      error: message,
    }));
  } finally {
    if (agent) await agent[Symbol.asyncDispose]();
  }
}

async function processQueue(apiKey?: string): Promise<void> {
  if (!apiKey) return;
  const all = await readAll();
  const running = all.filter((x) => x.status === "running");
  for (const item of running) {
    await refreshRunStatus(item, apiKey);
  }

  const latest = await readAll();
  const stillRunning = latest.some((x) => x.status === "running");
  if (stillRunning) return;

  const nextQueued = latest
    .filter((x) => x.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!nextQueued) return;

  await startQueuedItem(nextQueued, apiKey);
}

export async function listTailorQueueItems(
  personSlug?: string,
  apiKey?: string,
  options?: { advance?: boolean; includeHidden?: boolean },
): Promise<TailorQueueItem[]> {
  if (options?.advance && apiKey) {
    await processQueue(apiKey);
  }
  const latest = await readAll();
  let filtered =
    personSlug && personSlug.trim()
      ? latest.filter((x) => x.personSlug === personSlug.trim())
      : latest;
  if (!options?.includeHidden) {
    filtered = filtered.filter((x) => !x.hiddenAt);
  }
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Hide or unhide a queue item by internal `id` or display `jobId`. */
export async function setTailorQueueItemHidden(
  ref: string,
  hidden: boolean,
): Promise<TailorQueueItem | null> {
  const key = ref.trim();
  if (!key) return null;
  let updated: TailorQueueItem | null = null;
  const saved = await saveUpdatedItem(key, (curr) => {
    updated = {
      ...curr,
      hiddenAt: hidden ? nowIso() : undefined,
      updatedAt: nowIso(),
    };
    return updated;
  });
  return saved ? updated : null;
}

/** Persist first; start processing when apiKey is set. */
export async function enqueueTailorQueueItem(input: {
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
  modelId: string;
  apiKey?: string;
}): Promise<TailorQueueItem> {
  assertSafePathSegment(input.personSlug, "personSlug");
  assertSafePathSegment(input.companySlug, "companySlug");
  assertSafePathSegment(input.roleSlug, "roleSlug");
  const items = await readAll();
  const item: TailorQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    jobId: createJobId(),
    personSlug: input.personSlug.trim(),
    companySlug: input.companySlug.trim(),
    roleSlug: input.roleSlug.trim(),
    jobPostingUrl: normalizeJobPostingUrl(input.jobPostingUrl),
    modelId: normalizeModelId(input.modelId),
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  items.push(item);
  await writeAll(items);

  if (input.apiKey) {
    await processQueue(input.apiKey);
  }

  const latest = await readAll();
  return latest.find((x) => x.id === item.id) ?? item;
}

export async function markTailorQueueFinishedStatuses(apiKey: string): Promise<void> {
  await processQueue(apiKey);
}

export async function pruneTailorQueue(personSlug?: string): Promise<void> {
  const items = await readAll();
  const kept =
    personSlug && personSlug.trim()
      ? items.filter(
          (x) =>
            x.personSlug !== personSlug.trim() ||
            x.status === "running" ||
            x.status === "queued",
        )
      : items.filter((x) => x.status === "running" || x.status === "queued");
  await writeAll(kept);
}
