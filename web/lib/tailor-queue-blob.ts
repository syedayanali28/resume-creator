import { head, list, put } from "@vercel/blob";
import { isBlobConfigured } from "@/lib/blob-pdfs";

export const QUEUE_BLOB_PATH = "runtime/tailor-queue.json";

export async function readTailorQueueFromBlob(): Promise<string | null> {
  if (!isBlobConfigured()) return null;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return null;

  try {
    const meta = await head(QUEUE_BLOB_PATH, { token });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (res.ok) return await res.text();
  } catch {
    // fall through to list
  }

  try {
    const listed = await list({ prefix: "runtime/", limit: 50, token });
    const match = listed.blobs.find(
      (b) =>
        b.pathname === QUEUE_BLOB_PATH ||
        b.pathname.endsWith("/tailor-queue.json") ||
        b.pathname === "tailor-queue.json",
    );
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function writeTailorQueueToBlob(json: string): Promise<void> {
  if (!isBlobConfigured()) return;
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) return;

  await put(QUEUE_BLOB_PATH, json, {
    token,
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
  });
}
