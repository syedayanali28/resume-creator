import { Agent, type AgentOptions } from "@cursor/sdk";

function normalizeModelId(modelId: string): string {
  const m = modelId.trim();
  return m.length > 0 ? m : "composer-2";
}

export function cloudTargetBranch(): string {
  return process.env.CURSOR_CLOUD_REPO_REF?.trim() || "main";
}

export function buildCloudTailorAgentOptions(
  apiKey: string,
  modelId: string,
): AgentOptions {
  const repoUrl = process.env.CURSOR_CLOUD_REPO_URL?.trim();
  if (!repoUrl) {
    throw new Error("CURSOR_CLOUD_REPO_URL is not set.");
  }

  return {
    apiKey,
    model: { id: normalizeModelId(modelId) },
    cloud: {
      repos: [{ url: repoUrl, startingRef: cloudTargetBranch() }],
      autoCreatePR: false,
      workOnCurrentBranch: true,
      skipReviewerRequest: true,
    },
  };
}

export async function createCloudTailorAgent(apiKey: string, modelId: string) {
  return Agent.create(buildCloudTailorAgentOptions(apiKey, modelId));
}
