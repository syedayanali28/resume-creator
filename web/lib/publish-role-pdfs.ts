import { pullRepoIfLocal } from "@/lib/pull-repo";
import { syncRolePdfsToBlob } from "@/lib/sync-role-pdfs-to-blob";
import { useLocalTailorRuntime } from "@/lib/cursor-tailor-runtime";

/** Make finished job PDFs downloadable remotely (Vercel Blob + optional local git pull). */
export async function publishRolePdfsAfterRun(
  person: string,
  company: string,
  role: string,
): Promise<void> {
  if (!useLocalTailorRuntime()) {
    await pullRepoIfLocal();
  }
  await syncRolePdfsToBlob(person, company, role);
}
