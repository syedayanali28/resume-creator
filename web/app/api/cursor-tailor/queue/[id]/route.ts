import { NextResponse } from "next/server";
import { getTailorQueueItem, setTailorQueueItemHidden } from "@/lib/tailor-queue-store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: rawId } = await context.params;
  const id = decodeURIComponent(rawId);
  const item = await getTailorQueueItem(id);
  if (!item) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (item.status === "running") {
    return NextResponse.json(
      { error: "Cannot hide a job while it is running." },
      { status: 409 },
    );
  }

  try {
    const updated = await setTailorQueueItemHidden(id, true);
    if (!updated) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    return NextResponse.json({ item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to hide job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
