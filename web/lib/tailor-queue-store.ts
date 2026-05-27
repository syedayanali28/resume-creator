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
import { mergeQueueItemsById, mergeQueueWithPackets } from "@/lib/merge-queue-with-packets";
import { scanAllJobPackets } from "@/lib/scan-job-packets";
import {
  NO_OUTPUT_STALL_MS,
  runProgressFingerprint,
  stallMsSince,
} from "@/lib/tailor-queue-progress";
import { readTailorQueueFromBlob, writeTailorQueueToBlob } from "@/lib/tailor-queue-blob";

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
  /** Last time agent output/status fingerprint changed. */
  lastProgressAt?: string;
  progressFingerprint?: string;
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

const STALE_RUN_MS = 50 * 60 * 1000;
const MISSING_RUN_ID_MS = NO_OUTPUT_STALL_MS;

function runStartedMs(item: TailorQueueItem): number {
  const raw = item.startedAt ?? item.updatedAt ?? item.createdAt;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
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

function parseQueueJson(raw: string): TailorQueueItem[] {
  const parsed = JSON.parse(raw) as TailorQueueItem[];
  return Array.isArray(parsed) ? parsed.map(normalizeQueueItem) : [];
}

async function readQueueJsonSources(): Promise<TailorQueueItem[]> {
  const lists: TailorQueueItem[][] = [];

  const fromBlob = await readTailorQueueFromBlob();
  if (fromBlob) {
    try {
      lists.push(parseQueueJson(fromBlob));
    } catch {
      /* ignore corrupt blob */
    }
  }

  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_FILE, "utf8");
    lists.push(parseQueueJson(raw));
  } catch {
    /* no local file */
  }

  if (lists.length === 0) return [];
  return mergeQueueItemsById(...lists);
}

async function readAll(): Promise<TailorQueueItem[]> {
  return readQueueJsonSources();
}

export async function getTailorQueueItem(ref: string): Promise<TailorQueueItem | null> {
  const key = ref.trim();
  if (!key) return null;
  const items = await readAll();
  return items.find((x) => x.id === key || x.jobId === key) ?? null;
}

async function writeAll(items: TailorQueueItem[]): Promise<void> {
  const existing = await readQueueJsonSources();
  const queueOnly = items.filter((x) => !x.id.startsWith("packet-"));
  const merged = mergeQueueItemsById(existing.filter((x) => !x.id.startsWith("packet-")), queueOnly);
  const json = JSON.stringify(merged, null, 2);
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, json, "utf8");
  await writeTailorQueueToBlob(json);
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

async function markRunError(item: TailorQueueItem, message: string): Promise<void> {
  await saveUpdatedItem(item.id, (curr) => ({
    ...curr,
    status: "error",
    updatedAt: nowIso(),
    finishedAt: nowIso(),
    error: message,
  }));
}

function isQueueRecord(item: TailorQueueItem): boolean {
  return !item.id.startsWith("packet-");
}

async function readQueueOnly(): Promise<TailorQueueItem[]> {
  return (await readAll()).filter(isQueueRecord);
}

/** Move a running job to the back of the queue for a fresh retry later. */
async function requeueRunningToEnd(item: TailorQueueItem, reason: string): Promise<void> {
  const items = await readQueueOnly();
  const idx = findQueueItemIndex(items, item.id);
  if (idx < 0) return;

  const [removed] = items.splice(idx, 1);
  const now = nowIso();
  items.push({
    ...removed,
    status: "queued",
    updatedAt: now,
    startedAt: undefined,
    finishedAt: undefined,
    agentId: undefined,
    runId: undefined,
    lastProgressAt: undefined,
    progressFingerprint: undefined,
    durationMs: undefined,
    error: undefined,
    summary: `Requeued after skip: ${reason}`,
  });
  await writeAll(items);
}

export async function skipRunningJob(
  ref: string,
  apiKey: string,
  reason = "Skipped manually",
): Promise<TailorQueueItem | null> {
  const item = await getTailorQueueItem(ref);
  if (!item || !isQueueRecord(item) || item.status !== "running") {
    return null;
  }
  await requeueRunningToEnd(item, reason);
  await processQueue(apiKey);
  return getTailorQueueItem(ref);
}

/** Call from stream route when live output arrives. */
export async function touchQueueJobProgress(ref: string, fingerprint: string): Promise<void> {
  if (!ref.trim() || !fingerprint) return;
  await saveUpdatedItem(ref, (curr) => {
    if (curr.status !== "running") return curr;
    if (curr.progressFingerprint === fingerprint) return curr;
    return {
      ...curr,
      lastProgressAt: nowIso(),
      progressFingerprint: fingerprint,
      updatedAt: nowIso(),
    };
  });
}

async function recoverStuckRun(item: TailorQueueItem): Promise<boolean> {
  if (item.status !== "running") return false;
  const elapsed = Date.now() - runStartedMs(item);

  if (!item.runId || !item.agentId) {
    if (elapsed >= MISSING_RUN_ID_MS) {
      await requeueRunningToEnd(item, "No connection to Cursor within 2 minutes");
      return true;
    }
    return false;
  }

  if (stallMsSince(item.lastProgressAt, item.startedAt) >= NO_OUTPUT_STALL_MS) {
    await requeueRunningToEnd(item, "No output change for 2 minutes");
    return true;
  }

  if (elapsed > STALE_RUN_MS) {
    await markRunError(
      item,
      "Run timed out after 50 minutes. Check the Cursor dashboard for this agent, then retry.",
    );
    return true;
  }

  return false;
}

async function refreshRunStatus(item: TailorQueueItem, apiKey: string): Promise<void> {
  if (item.status !== "running") return;
  if (await recoverStuckRun(item)) return;
  if (!item.agentId || !item.runId) return;

  try {
    const run = await Agent.getRun(item.runId, {
      runtime: agentRuntime(),
      agentId: item.agentId,
      apiKey,
    });

    const fingerprint = runProgressFingerprint(run);
    const latest = (await getTailorQueueItem(item.id)) ?? item;

    if (run.status === "running") {
      if (fingerprint !== latest.progressFingerprint) {
        await saveUpdatedItem(item.id, (curr) => ({
          ...curr,
          lastProgressAt: nowIso(),
          progressFingerprint: fingerprint,
          updatedAt: nowIso(),
        }));
        return;
      }
      if (stallMsSince(latest.lastProgressAt, latest.startedAt) >= NO_OUTPUT_STALL_MS) {
        await requeueRunningToEnd(latest, "No output change for 2 minutes");
      }
      return;
    }

    await finishRunOnItem(item, {
      status: run.status,
      result: run.result ?? null,
      durationMs: run.durationMs ?? null,
    });
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

    const started = nowIso();
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: "running",
      updatedAt: started,
      startedAt: started,
      lastProgressAt: started,
      progressFingerprint: `starting|${run.id}`,
      agentId: agent?.agentId,
      runId: run.id,
      error: undefined,
    }));

    if (useLocal) {
      const result = await run.wait();
      await finishRunOnItem(item, result);
    }
    // Cloud: do not dispose agent or wait here — Cursor runs remotely; polls refresh status.
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to start remote run";
    await markRunError(item, message);
  } finally {
    if (agent && useLocal) await agent[Symbol.asyncDispose]();
  }
}

async function processQueue(apiKey?: string): Promise<void> {
  if (!apiKey) return;
  const all = await readQueueOnly();
  const running = all.filter((x) => x.status === "running");
  for (const item of running) {
    await refreshRunStatus(item, apiKey);
  }

  const latest = await readQueueOnly();
  const stillRunning = latest.some((x) => x.status === "running");
  if (stillRunning) return;

  const nextQueued = latest
    .filter((x) => x.status === "queued")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
  if (!nextQueued) return;

  await startQueuedItem(nextQueued, apiKey);
}

export type TailorQueueListResult = {
  items: TailorQueueItem[];
  queueCount: number;
  packetCount: number;
  mergedFromPackets: number;
};

export async function listTailorQueueItems(
  personSlug?: string,
  apiKey?: string,
  options?: { advance?: boolean },
): Promise<TailorQueueListResult> {
  if (options?.advance && apiKey) {
    await processQueue(apiKey);
  }
  const queue = await readAll();
  const person = personSlug?.trim();
  const queueFiltered = person ? queue.filter((x) => x.personSlug === person) : queue;

  const packets = await scanAllJobPackets(person);
  const merged = mergeQueueWithPackets(queueFiltered, packets);

  return {
    items: merged,
    queueCount: queueFiltered.length,
    packetCount: packets.length,
    mergedFromPackets: merged.length - queueFiltered.length,
  };
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
