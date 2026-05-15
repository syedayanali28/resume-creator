import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import path from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { buildTailorPrompt } from "@/lib/build-tailor-prompt";
import { assertSafePathSegment, getPeopleRoot } from "@/lib/paths";
import {
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";

export const maxDuration = 300;

function parseHttpUrl(raw: string, label: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u;
  } catch {
    throw new Error(`Invalid ${label}`);
  }
}

function getRepoRootFromPeopleRoot(): string {
  return path.resolve(getPeopleRoot(), "..");
}

export async function POST(request: Request) {
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (!verifyPortalSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "CURSOR_API_KEY is not set. Add it to web/.env.local (see web/.env.example), restart the dev server, then try again. Keys: https://cursor.com/dashboard/integrations",
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
  const jobPostingUrlRaw =
    typeof b.jobPostingUrl === "string" ? b.jobPostingUrl.trim() : "";

  if (!personSlug || !companySlug || !roleSlug || !jobPostingUrlRaw) {
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
  } catch {
    return NextResponse.json({ error: "Invalid path segment" }, { status: 400 });
  }

  let jobPostingUrl: URL;
  try {
    const u = parseHttpUrl(jobPostingUrlRaw, "job posting URL");
    if (!u) {
      return NextResponse.json(
        { error: "jobPostingUrl must be a valid http(s) URL" },
        { status: 400 },
      );
    }
    jobPostingUrl = u;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid jobPostingUrl" },
      { status: 400 },
    );
  }

  const useLocal = process.env.CURSOR_TAILOR_RUNTIME?.trim().toLowerCase() === "local";
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  const startingRef = process.env.CURSOR_CLOUD_REPO_REF?.trim() || "main";
  const autoCreatePR =
    process.env.CURSOR_CLOUD_AUTO_CREATE_PR?.trim().toLowerCase() === "true";

  const prompt = buildTailorPrompt({
    personSlug,
    companySlug,
    roleSlug,
    jobPostingUrl: jobPostingUrl.toString(),
  });

  const agentOptions = {
    apiKey,
    model: { id: "composer-2" as const },
    ...(useLocal
      ? {
          local: {
            cwd: getRepoRootFromPeopleRoot(),
          },
        }
      : {
          cloud: {
            repos: [{ url: repoUrl!, startingRef }],
            autoCreatePR,
            skipReviewerRequest: true,
          },
        }),
  };

  if (!useLocal && !repoUrl) {
    return NextResponse.json(
      {
        error:
          "Set CURSOR_CLOUD_REPO_URL to your Git remote (for example https://github.com/you/resume_creator.git) for cloud runs, or set CURSOR_TAILOR_RUNTIME=local to run against the server checkout.",
      },
      { status: 503 },
    );
  }

  try {
    const result = await Agent.prompt(prompt, agentOptions);

    const prUrl = result.git?.branches?.find((x) => x.prUrl)?.prUrl;

    return NextResponse.json({
      ok: result.status === "finished",
      status: result.status,
      runId: result.id,
      summary: result.result ?? null,
      durationMs: result.durationMs ?? null,
      prUrl: prUrl ?? null,
      git: result.git ?? null,
      runtime: useLocal ? "local" : "cloud",
    });
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          code: err.code,
          isRetryable: err.isRetryable,
        },
        { status: err.status && err.status >= 400 && err.status < 600 ? err.status : 502 },
      );
    }
    throw err;
  }
}
