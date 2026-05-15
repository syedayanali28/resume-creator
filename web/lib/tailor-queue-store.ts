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
  mergedAt?: string;
  mergeError?: string;
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

function isBlobNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("not found") || msg.includes("404");
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
    if (!res.ok) {
      throw new Error(`Blob queue fetch failed (${res.status})`);
    }
    const parsed = (await res.json()) as TailorQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (isBlobNotFoundError(err)) {
      return [];
    }
    throw err;
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

function getGitHubToken(): string | null {
  const token = process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim() || "";
  return token || null;
}

function parseGithubPr(prUrl: string): { owner: string; repo: string; pullNumber: number } | null {
  try {
    const u = new URL(prUrl);
    if (u.hostname !== "github.com") return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    if (parts[2] !== "pull") return null;
    const pullNumber = Number(parts[3]);
    if (!Number.isInteger(pullNumber) || pullNumber <= 0) return null;
    return { owner: parts[0], repo: parts[1], pullNumber };
  } catch {
    return null;
  }
}

async function mergePrIfConfigured(prUrl: string): Promise<{ mergedAt?: string; mergeError?: string }> {
  const token = getGitHubToken();
  if (!token) {
    return { mergeError: "Auto-merge skipped: set GITHUB_TOKEN (or GH_TOKEN)." };
  }
  const parsed = parseGithubPr(prUrl);
  if (!parsed) {
    return { mergeError: "Auto-merge skipped: invalid GitHub PR URL." };
  }

  const mergeMethod = process.env.CURSOR_CLOUD_AUTO_MERGE_METHOD?.trim() || "squash";
  const res = await fetch(
    `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/pulls/${parsed.pullNumber}/merge`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "resume-creator-tailor-queue",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ merge_method: mergeMethod }),
      cache: "no-store",
    },
  );

  if (res.ok) {
    return { mergedAt: nowIso() };
  }
  let message = `GitHub merge failed (${res.status})`;
  try {
    const data = (await res.json()) as { message?: string };
    if (data.message) message = data.message;
  } catch {
    // keep fallback
  }
  return { mergeError: message };
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
    const shouldAutoMerge =
      process.env.CURSOR_CLOUD_AUTO_MERGE_PR?.trim().toLowerCase() !== "false";
    const mergeResult =
      result.status === "finished" && prUrl && shouldAutoMerge
        ? await mergePrIfConfigured(prUrl)
        : {};
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: result.status === "finished" ? "finished" : "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      summary: result.result ?? null,
      durationMs: result.durationMs ?? null,
      prUrl,
      mergedAt: mergeResult.mergedAt,
      mergeError: mergeResult.mergeError,
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

async function startQueuedItem(item: TailorQueueItem, apiKey: string): Promise<void> {
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  if (!repoUrl) {
    await saveUpdatedItem(item.id, (curr) => ({
      ...curr,
      status: "error",
      updatedAt: nowIso(),
      finishedAt: nowIso(),
      error: "CURSOR_CLOUD_REPO_URL is required for remote queue processing.",
    }));
    return;
  }

  const startingRef = process.env.CURSOR_CLOUD_REPO_REF?.trim() || "main";
  const autoCreatePR =
    process.env.CURSOR_CLOUD_AUTO_CREATE_PR?.trim().toLowerCase() === "true";
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
    agent = await Agent.create({
      apiKey,
      model: { id: normalizeModelId(item.modelId) },
      cloud: {
        repos: [{ url: repoUrl, startingRef }],
        autoCreatePR,
        skipReviewerRequest: true,
      },
    });
    const run = await agent.send(prompt);
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
): Promise<TailorQueueItem[]> {
  await processQueue(apiKey);
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
  const items = await readAll();
  const item: TailorQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    personSlug: input.personSlug.trim(),
    companySlug: input.companySlug.trim(),
    roleSlug: input.roleSlug.trim(),
    jobPostingUrl: input.jobPostingUrl.trim(),
    modelId: normalizeModelId(input.modelId),
    status: "queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  items.push(item);
  await writeAll(items);
  await processQueue(input.apiKey);
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

