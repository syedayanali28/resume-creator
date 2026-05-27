import path from "node:path";
import { Agent, CursorAgentError } from "@cursor/sdk";
import { buildTailorPrompt } from "@/lib/build-tailor-prompt";
import { buildCloudTailorAgentOptions } from "@/lib/cursor-cloud-agent";
import { useLocalTailorRuntime } from "@/lib/cursor-tailor-runtime";
import { normalizeJobPostingUrl } from "@/lib/job-from-url";
import { assertSafePathSegment, getPeopleRoot } from "@/lib/paths";

export const maxDuration = 300;

type StreamEvent =
  | { type: "status"; status: string }
  | { type: "thinking"; message: string }
  | { type: "assistant"; text: string }
  | { type: "tool_call"; name: string; status: string }
  | {
      type: "meta";
      runtime: "local" | "cloud";
      agentId: string;
      runId?: string;
      modelId?: string;
    }
  | {
      type: "result";
      ok: boolean;
      status: string;
      runId: string;
      summary: string | null;
      durationMs: number | null;
      redirectTo: string;
    }
  | { type: "error"; error: string; code?: string; isRetryable?: boolean };

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

function redirectUrl(personSlug: string, companySlug: string, roleSlug: string): string {
  const p = encodeURIComponent(personSlug);
  const c = encodeURIComponent(companySlug);
  const r = encodeURIComponent(roleSlug);
  return `/person/${p}?company=${c}&role=${r}`;
}

function writeNdjsonLine(controller: ReadableStreamDefaultController<Uint8Array>, obj: StreamEvent) {
  const enc = new TextEncoder();
  controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));
}

export async function POST(request: Request) {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "CURSOR_API_KEY is not set. Add it to web/.env.local (see web/.env.example), restart the dev server, then try again. Keys: https://cursor.com/dashboard/integrations",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (typeof body !== "object" || body === null) {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const b = body as Record<string, unknown>;
  const personSlug = typeof b.personSlug === "string" ? b.personSlug.trim() : "";
  const companySlug = typeof b.companySlug === "string" ? b.companySlug.trim() : "";
  const roleSlug = typeof b.roleSlug === "string" ? b.roleSlug.trim() : "";
  const jobPostingUrlRaw =
    typeof b.jobPostingUrl === "string" ? normalizeJobPostingUrl(b.jobPostingUrl) : "";
  const modelIdRaw = typeof b.modelId === "string" ? b.modelId.trim() : "";
  const modelId = modelIdRaw || "composer-2";

  if (!personSlug || !companySlug || !roleSlug || !jobPostingUrlRaw) {
    return new Response(
      JSON.stringify({
        error: "Missing required fields: personSlug, companySlug, roleSlug, jobPostingUrl",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    assertSafePathSegment(personSlug, "personSlug");
    assertSafePathSegment(companySlug, "companySlug");
    assertSafePathSegment(roleSlug, "roleSlug");
  } catch {
    return new Response(JSON.stringify({ error: "Invalid path segment" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let jobPostingUrl: URL;
  try {
    const u = parseHttpUrl(jobPostingUrlRaw, "job posting URL");
    if (!u) {
      return new Response(JSON.stringify({ error: "jobPostingUrl must be a valid http(s) URL" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    jobPostingUrl = u;
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Invalid jobPostingUrl" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const useLocal = useLocalTailorRuntime();
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();

  if (!useLocal && !repoUrl) {
    return new Response(
      JSON.stringify({
        error:
          "Set CURSOR_CLOUD_REPO_URL to your Git remote (for example https://github.com/you/resume_creator.git) for cloud runs, or set CURSOR_TAILOR_RUNTIME=local to run against the server checkout.",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const prompt = buildTailorPrompt({
    personSlug,
    companySlug,
    roleSlug,
    jobPostingUrl: jobPostingUrl.toString(),
  });

  const agentOptions = useLocal
    ? {
        apiKey,
        model: { id: modelId },
        local: { cwd: getRepoRootFromPeopleRoot() },
      }
    : buildCloudTailorAgentOptions(apiKey, modelId);

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        const runtime = useLocal ? "local" : "cloud";
        let agent: Awaited<ReturnType<typeof Agent.create>> | null = null;
        try {
          agent = await Agent.create(agentOptions);
          writeNdjsonLine(controller, {
            type: "meta",
            runtime,
            agentId: agent.agentId,
            modelId,
          });

          const run = await agent.send(prompt);
          writeNdjsonLine(controller, {
            type: "meta",
            runtime,
            agentId: agent.agentId,
            runId: run.id,
            modelId,
          });

          for await (const event of run.stream()) {
            if (event.type === "assistant") {
              for (const block of event.message.content) {
                if (block.type === "text" && block.text.trim()) {
                  writeNdjsonLine(controller, { type: "assistant", text: block.text });
                }
              }
            } else if (event.type === "thinking") {
              writeNdjsonLine(controller, {
                type: "thinking",
                message:
                  typeof event.text === "string" && event.text.trim()
                    ? event.text
                    : "Model is reasoning...",
              });
            } else if (event.type === "tool_call") {
              writeNdjsonLine(controller, {
                type: "tool_call",
                name: event.name,
                status: event.status,
              });
            } else if (event.type === "status") {
              writeNdjsonLine(controller, { type: "status", status: event.status });
            }
          }

          const result = await run.wait();
          writeNdjsonLine(controller, {
            type: "result",
            ok: result.status === "finished",
            status: result.status,
            runId: result.id,
            summary: result.result ?? null,
            durationMs: result.durationMs ?? null,
            redirectTo: redirectUrl(personSlug, companySlug, roleSlug),
          });
        } catch (err) {
          if (err instanceof CursorAgentError) {
            writeNdjsonLine(controller, {
              type: "error",
              error: err.message,
              code: err.code,
              isRetryable: err.isRetryable,
            });
          } else {
            writeNdjsonLine(controller, {
              type: "error",
              error: err instanceof Error ? err.message : "Unknown streaming error",
            });
          }
        } finally {
          if (agent) {
            await agent[Symbol.asyncDispose]();
          }
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
