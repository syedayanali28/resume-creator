import { NextResponse } from "next/server";
import { inferSlugsFromJobUrl, normalizeJobPostingUrl } from "@/lib/job-from-url";
import { assertSafePathSegment } from "@/lib/paths";
import {
  enqueueTailorQueueItem,
  listTailorQueueItems,
  pruneTailorQueue,
} from "@/lib/tailor-queue-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const personSlug = url.searchParams.get("person")?.trim();
  const prune = url.searchParams.get("prune") === "1";
  if (personSlug) {
    try {
      assertSafePathSegment(personSlug, "personSlug");
    } catch {
      return NextResponse.json({ error: "Invalid personSlug" }, { status: 400 });
    }
  }
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  const advance = url.searchParams.get("advance") === "1";
  const includeHidden = url.searchParams.get("includeHidden") === "1";
  if (prune) {
    await pruneTailorQueue(personSlug);
  }

  try {
    const items = await listTailorQueueItems(personSlug, apiKey, { advance, includeHidden });
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load queue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const personSlug = typeof b.personSlug === "string" ? b.personSlug.trim() : "";
  let companySlug = typeof b.companySlug === "string" ? b.companySlug.trim() : "";
  let roleSlug = typeof b.roleSlug === "string" ? b.roleSlug.trim() : "";
  const jobPostingUrl =
    typeof b.jobPostingUrl === "string" ? normalizeJobPostingUrl(b.jobPostingUrl) : "";
  const modelId = typeof b.modelId === "string" ? b.modelId.trim() : "composer-2";

  if (!personSlug || !jobPostingUrl) {
    return NextResponse.json(
      { error: "Missing required fields: personSlug, jobPostingUrl" },
      { status: 400 },
    );
  }

  if (!companySlug || !roleSlug) {
    const inferred = inferSlugsFromJobUrl(jobPostingUrl, null);
    companySlug = companySlug || inferred.companySlug;
    roleSlug = roleSlug || inferred.roleSlug;
  }

  try {
    assertSafePathSegment(personSlug, "personSlug");
    assertSafePathSegment(companySlug, "companySlug");
    assertSafePathSegment(roleSlug, "roleSlug");
    const u = new URL(jobPostingUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return NextResponse.json({ error: "jobPostingUrl must be http(s)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request fields" }, { status: 400 });
  }

  try {
    const item = await enqueueTailorQueueItem({
      personSlug,
      companySlug,
      roleSlug,
      jobPostingUrl,
      modelId,
      apiKey,
    });
    return NextResponse.json({ item });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enqueue item";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
