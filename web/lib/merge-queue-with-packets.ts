import type { JobPacketRecord } from "@/lib/scan-job-packets";
import type { TailorQueueItem } from "@/lib/tailor-queue-store";

function packetKey(person: string, company: string, role: string): string {
  return `${person}/${company}/${role}`;
}

function queueRoleKey(item: Pick<TailorQueueItem, "personSlug" | "companySlug" | "roleSlug">): string {
  return packetKey(item.personSlug, item.companySlug, item.roleSlug);
}

function packetToQueueItem(packet: JobPacketRecord): TailorQueueItem {
  const stamp = packet.updatedAt || new Date().toISOString();
  const id = `packet-${packet.personSlug}-${packet.companySlug}-${packet.roleSlug}`;
  return {
    id,
    jobId: `P-${packet.roleSlug.slice(0, 8)}`,
    personSlug: packet.personSlug,
    companySlug: packet.companySlug,
    roleSlug: packet.roleSlug,
    jobPostingUrl: packet.jobPostingUrl ?? "",
    modelId: "composer-2",
    status: "finished",
    createdAt: stamp,
    updatedAt: stamp,
    finishedAt: stamp,
    summary:
      packet.source === "blob"
        ? "Recovered from Vercel Blob (PDFs on server)."
        : "Recovered from server files (people/ folder).",
  };
}

/** Merge persisted queue rows with on-disk / Blob PDF packets so jobs never vanish from the UI. */
export function mergeQueueWithPackets(
  queue: TailorQueueItem[],
  packets: JobPacketRecord[],
): TailorQueueItem[] {
  const byRole = new Map<string, TailorQueueItem>();

  for (const item of queue) {
    byRole.set(queueRoleKey(item), item);
  }

  for (const packet of packets) {
    const key = packetKey(packet.personSlug, packet.companySlug, packet.roleSlug);
    if (byRole.has(key)) continue;
    byRole.set(key, packetToQueueItem(packet));
  }

  return [...byRole.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function mergeQueueItemsById(
  ...lists: TailorQueueItem[][]
): TailorQueueItem[] {
  const byId = new Map<string, TailorQueueItem>();
  for (const list of lists) {
    for (const item of list) {
      const prev = byId.get(item.id);
      if (!prev || item.updatedAt.localeCompare(prev.updatedAt) > 0) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()];
}
