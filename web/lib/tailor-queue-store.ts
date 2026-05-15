import fs from "node:fs/promises";
import path from "node:path";
import { head, put } from "@vercel/blob";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { buildTailorPrompt } from "@/lib/build-tailor-prompt";
import { assertSafePathSegment } from "@/lib/paths";

export type TailorQueueStatus = "queued" | "running" | "finished" | "error";

export type TailorQueueItem = {
  id: string;
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
  prUrl?: string | null;
  error?: string;
};

const STORE_DIR = path.resolve(process.cwd(), ".runtime");
const STORE_FILE = path.join(STORE_DIR, "tailor-queue.json");
const BLOB_STATE_PATH = "state/tailor-queue.json";

function nowIso(): string {
  return new Date().toISOString();
}

function useBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function readAllFromFs(): Promise<TailorQueueItem[]> {
  try {
    await fs.mkdir(STORE_DIR, { recursive: true });
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as TailorQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllToFs(items: TailorQueueItem[]): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(items, null, 2), "utf8");
}

async function readAllFromBlob(): Promise<TailorQueueItem[]> {
  try {
    const meta = await head(BLOB_STATE_PATH);
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return [];
    const parsed = (await res.json()) as TailorQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAllToBlob(items: TailorQueueItem[]): Promise<void> {
  await put(BLOB_STATE_PATH, JSON.stringify(items, null, 2), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
    allowOverwrite: true,
  });
}

async function readAll(): Promise<TailorQueueItem[]> {
  if (useBlobStore()) return readAllFromBlob();
  return readAllFromFs();
}

async function writeAll(items: TailorQueueItem[]): Promise<void> {
  if (useBlobStore()) {
    await writeAllToBlob(items);
    return;
  }
  await writeAllToFs(items);
}

function normalizeModelId(modelId: string): string {
  const m = modelId.trim();
  return m.length > 0 ? m : "composer-2";
}

async function saveUpdatedItem(
  id: string,
  updater: (item: TailorQueueItem) => TailorQueueItem,
): Promise<void> {
  const items = await readAll();
  const idx = items.findIndex((x) => x.id === id);
  if (idx < 0) return;
  items[idx] = updater(items[idx]!);
  await writeAll(items);
}

async function refreshRunStatus(item: TailorQueueItem, apiKey: string): Promise<void> {
  if (!item.agentId || !item.runId || item.status !== "running") return;
  try {
    const run = await Agent.getRun(item.runId, {
      runtime: "cloud",
      agentId: item.agentId,
      apiKey,
    });
    if (run.status === "running") return;
    const result = await run.wait();
    const prUrl = result.git?.branches?.find((x) => x.prUrl)?.prUrl ?? null;
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: result.status === "finished" ? "finished" : "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      summary: result.result ?? null,
      durationMs: result.durationMs ?? null,
      prUrl,
      error: result.status === "finished" ? undefined : `Run ended with status: ${result.status}`,
    }));
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

export async function listTailorQueueItems(
  personSlug?: string,
  apiKey?: string,
): Promise<TailorQueueItem[]> {
  const all = await readAll();
  if (apiKey) {
    const running = all.filter((x) => x.status === "running");
    for (const item of running) {
      await refreshRunStatus(item, apiKey);
    }
  }
  const latest = await readAll();
  const filtered =
    personSlug && personSlug.trim()
      ? latest.filter((x) => x.personSlug === personSlug.trim())
      : latest;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function enqueueTailorQueueItem(input: {
  personSlug: string;
  companySlug: string;
  roleSlug: string;
  jobPostingUrl: string;
  modelId: string;
  apiKey: string;
}): Promise<TailorQueueItem> {
  assertSafePathSegment(input.personSlug, "personSlug");
  assertSafePathSegment(input.companySlug, "companySlug");
  assertSafePathSegment(input.roleSlug, "roleSlug");
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  if (!repoUrl) {
    throw new Error("CURSOR_CLOUD_REPO_URL is required for remote queue processing.");
  }
  const items = await readAll();
  const item: TailorQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    personSlug: input.personSlug.trim(),
    companySlug: input.companySlug.trim(),
    roleSlug: input.roleSlug.trim(),
    jobPostingUrl: input.jobPostingUrl.trim(),
    modelId: normalizeModelId(input.modelId),
    status: "running",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    startedAt: nowIso(),
  };
  const startingRef = process.env.CURSOR_CLOUD_REPO_REF?.trim() || "main";
  const autoCreatePR =
    process.env.CURSOR_CLOUD_AUTO_CREATE_PR?.trim().toLowerCase() === "true";

  const prompt = buildTailorPrompt({
    personSlug: item.personSlug,
    companySlug: item.companySlug,
    roleSlug: item.roleSlug,
    jobPostingUrl: item.jobPostingUrl,
  });

  let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;
  try {
    agent = await Agent.create({
      apiKey: input.apiKey,
      model: { id: normalizeModelId(item.modelId) },
      cloud: {
        repos: [{ url: repoUrl, startingRef }],
        autoCreatePR,
        skipReviewerRequest: true,
      },
    });
    const run = await agent.send(prompt);
    item.agentId = agent.agentId;
    item.runId = run.id;
    item.error = undefined;
  } catch (err) {
    const message =
      err instanceof CursorAgentError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Failed to start remote run";
    item.status = "error";
    item.finishedAt = nowIso();
    item.error = message;
  } finally {
    if (agent) await agent[Symbol.asyncDispose]();
    item.updatedAt = nowIso();
    items.push(item);
    await writeAll(items);
  }
  return item;
}

export async function markTailorQueueFinishedStatuses(apiKey: string): Promise<void> {
  const items = await readAll();
  const running = items.filter((x) => x.status === "running");
  for (const item of running) {
    await refreshRunStatus(item, apiKey);
  }
}

export async function pruneTailorQueue(personSlug?: string): Promise<void> {
  const items = await readAll();
  const kept =
    personSlug && personSlug.trim()
      ? items.filter(
          (x) =>
            x.personSlug !== personSlug.trim() ||
            x.status === "running",
        )
      : items.filter((x) => x.status === "running");
  await writeAll(kept);
}

