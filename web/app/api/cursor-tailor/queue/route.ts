import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { assertSafePathSegment } from "@/lib/paths";
import {
  enqueueTailorQueueItem,
  listTailorQueueItems,
  pruneTailorQueue,
} from "@/lib/tailor-queue-store";
import { portalSessionCookieName, verifyPortalSession } from "@/lib/session";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (!verifyPortalSession(token)) return unauthorized();

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
  if (prune) {
    await pruneTailorQueue(personSlug);
  }

  const items = await listTailorQueueItems(personSlug, apiKey);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (!verifyPortalSession(token)) return unauthorized();

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "CURSOR_API_KEY is not set. Add it to web/.env.local, restart dev server, and retry.",
      },
      { status: 503 },
    );
  }

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
  const companySlug = typeof b.companySlug === "string" ? b.companySlug.trim() : "";
  const roleSlug = typeof b.roleSlug === "string" ? b.roleSlug.trim() : "";
  const jobPostingUrl = typeof b.jobPostingUrl === "string" ? b.jobPostingUrl.trim() : "";
  const modelId = typeof b.modelId === "string" ? b.modelId.trim() : "composer-2";

  if (!personSlug || !companySlug || !roleSlug || !jobPostingUrl) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: personSlug, companySlug, roleSlug, jobPostingUrl",
      },
      { status: 400 },
    );
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

  const item = await enqueueTailorQueueItem({
    personSlug,
    companySlug,
    roleSlug,
    jobPostingUrl,
    modelId,
    apiKey,
  });
  return NextResponse.json({ item });
}

