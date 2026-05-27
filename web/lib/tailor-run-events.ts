import type { SDKMessage } from "@cursor/sdk";

export type TailorStreamEvent =
  | { type: "meta"; jobId: string; runId?: string; agentId?: string; status?: string }
  | { type: "status"; status: string }
  | { type: "thinking"; message: string }
  | { type: "assistant"; text: string }
  | { type: "tool_call"; name: string; status: string }
  | { type: "result"; ok: boolean; status: string; summary: string | null; durationMs?: number | null }
  | { type: "error"; error: string };

export function sdkMessageToStreamEvent(msg: SDKMessage): TailorStreamEvent | null {
  if (msg.type === "assistant") {
    const parts = msg.message.content
      .filter((b): b is { type: "text"; text: string } => b.type === "text")
      .map((b) => b.text.trim())
      .filter(Boolean);
    if (parts.length === 0) return null;
    return { type: "assistant", text: parts.join("\n") };
  }
  if (msg.type === "thinking") {
    const text = msg.text?.trim() || "Model is reasoning…";
    return { type: "thinking", message: text };
  }
  if (msg.type === "tool_call") {
    return { type: "tool_call", name: msg.name, status: msg.status };
  }
  if (msg.type === "status") {
    return { type: "status", status: msg.status };
  }
  return null;
}

export function encodeNdjsonLine(obj: TailorStreamEvent): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}
