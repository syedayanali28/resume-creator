import { Agent, CursorAgentError } from "@cursor/sdk";
import { useLocalTailorRuntime } from "@/lib/cursor-tailor-runtime";
import {
  encodeNdjsonLine,
  sdkMessageToStreamEvent,
  type TailorStreamEvent,
} from "@/lib/tailor-run-events";
import { getTailorQueueItem } from "@/lib/tailor-queue-store";

export const maxDuration = 300;

function agentRuntime(): "local" | "cloud" {
  return useLocalTailorRuntime() ? "local" : "cloud";
}

function pushEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: TailorStreamEvent,
): boolean {
  try {
    controller.enqueue(encodeNdjsonLine(event));
    return true;
  } catch {
    return false;
  }
}

function closeStream(controller: ReadableStreamDefaultController<Uint8Array>): void {
  try {
    controller.close();
  } catch {
    // Already closed (e.g. client disconnected or closed in try block).
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const item = await getTailorQueueItem(decodeURIComponent(id));
  if (!item) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "CURSOR_API_KEY is not set" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          if (
            !pushEvent(controller, {
              type: "meta",
              jobId: item.jobId,
              runId: item.runId,
              agentId: item.agentId,
              status: item.status,
            })
          ) {
            return;
          }

          if (!item.runId || !item.agentId) {
            if (item.status === "queued") {
              pushEvent(controller, { type: "status", status: "Waiting in queue…" });
            } else if (item.error) {
              pushEvent(controller, { type: "error", error: item.error });
            }
            return;
          }

          const run = await Agent.getRun(item.runId, {
            runtime: agentRuntime(),
            agentId: item.agentId,
            apiKey,
          });

          if (run.supports("stream")) {
            for await (const msg of run.stream()) {
              const ev = sdkMessageToStreamEvent(msg);
              if (ev && !pushEvent(controller, ev)) break;
            }
          } else if (item.summary) {
            pushEvent(controller, { type: "assistant", text: item.summary });
          }

          const status = run.status === "running" ? item.status : run.status;
          const summary = run.result ?? item.summary ?? null;
          const durationMs = run.durationMs ?? item.durationMs ?? null;

          if (status !== "running") {
            pushEvent(controller, {
              type: "result",
              ok: status === "finished",
              status,
              summary,
              durationMs,
            });
          } else {
            pushEvent(controller, { type: "status", status: "Agent still running…" });
          }
        } catch (err) {
          const message =
            err instanceof CursorAgentError
              ? err.message
              : err instanceof Error
                ? err.message
                : "Failed to load agent output";
          pushEvent(controller, { type: "error", error: message });
        } finally {
          closeStream(controller);
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
