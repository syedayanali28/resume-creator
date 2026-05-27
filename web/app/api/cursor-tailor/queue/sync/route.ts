import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isBlobConfigured } from "@/lib/blob-pdfs";
import { QUEUE_BLOB_PATH, writeTailorQueueToBlob } from "@/lib/tailor-queue-blob";

/** Push local `.runtime/tailor-queue.json` to Vercel Blob (run once after deploy). */
export async function POST() {
  if (!isBlobConfigured()) {
    return NextResponse.json(
      { error: "BLOB_READ_WRITE_TOKEN is not set." },
      { status: 503 },
    );
  }

  const localFile = path.resolve(process.cwd(), ".runtime", "tailor-queue.json");
  try {
    const raw = await fs.readFile(localFile, "utf8");
    await writeTailorQueueToBlob(raw);
    const count = (JSON.parse(raw) as unknown[]).length;
    return NextResponse.json({ ok: true, path: QUEUE_BLOB_PATH, count });
  } catch {
    return NextResponse.json(
      { error: `No local queue file at ${localFile}` },
      { status: 404 },
    );
  }
}
