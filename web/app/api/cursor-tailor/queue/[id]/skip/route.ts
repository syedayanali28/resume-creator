import { NextResponse } from "next/server";
import { getTailorQueueItem, skipRunningJob } from "@/lib/tailor-queue-store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "CURSOR_API_KEY is not set" }, { status: 503 });
  }

  const { id } = await context.params;
  const ref = decodeURIComponent(id);
  const before = await getTailorQueueItem(ref);
  if (!before) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (before.id.startsWith("packet-")) {
    return NextResponse.json({ error: "Cannot skip archive-only jobs" }, { status: 400 });
  }
  if (before.status !== "running") {
    return NextResponse.json({ error: "Only running jobs can be skipped" }, { status: 409 });
  }

  const item = await skipRunningJob(ref, apiKey, "Skipped manually");
  if (!item) {
    return NextResponse.json({ error: "Skip failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, item });
}
