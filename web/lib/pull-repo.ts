import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { getPeopleRoot } from "@/lib/paths";

const execFileAsync = promisify(execFile);

function repoRoot(): string {
  return path.resolve(getPeopleRoot(), "..");
}

/** After a cloud run, pull latest PDFs into the local checkout (dev only). */
export async function pullRepoIfLocal(): Promise<void> {
  if (process.env.VERCEL === "1") return;
  try {
    await execFileAsync("git", ["pull", "--ff-only"], {
      cwd: repoRoot(),
      timeout: 90_000,
    });
  } catch {
    // Non-fatal: downloads can still use Blob or GitHub raw.
  }
}
