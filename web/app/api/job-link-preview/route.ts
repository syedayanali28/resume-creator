import { NextResponse } from "next/server";
import { extractOgTitle, inferSlugsFromJobUrl, normalizeJobPostingUrl } from "@/lib/job-from-url";

const PREVIEW_TIMEOUT_MS = 3_500;
const PREVIEW_TIMEOUT_MS_LINKEDIN = 2_500;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    typeof body === "object" &&
    body !== null &&
    "jobUrl" in body &&
    typeof (body as { jobUrl: unknown }).jobUrl === "string"
      ? normalizeJobPostingUrl((body as { jobUrl: string }).jobUrl)
      : "";

  if (!raw) {
    return NextResponse.json({ error: "jobUrl is required" }, { status: 400 });
  }

  let jobUrl: URL;
  try {
    jobUrl = new URL(raw);
    if (jobUrl.protocol !== "http:" && jobUrl.protocol !== "https:") {
      return NextResponse.json({ error: "jobUrl must be http(s)" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid jobUrl" }, { status: 400 });
  }

  let pageTitle: string | null = null;
  let fetchOk = false;
  try {
    const isLinkedIn = /(^|\.)linkedin\.com$/i.test(jobUrl.hostname);
    const ac = new AbortController();
    const timeoutMs = isLinkedIn ? PREVIEW_TIMEOUT_MS_LINKEDIN : PREVIEW_TIMEOUT_MS;
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(jobUrl.toString(), {
      redirect: "follow",
      signal: ac.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    clearTimeout(t);
    fetchOk = res.ok;
    if (res.ok) {
      const html = await res.text();
      pageTitle = extractOgTitle(html);
    }
  } catch {
    // LinkedIn often blocks or times out; slug inference still works from URL.
  }

  const inferred = inferSlugsFromJobUrl(jobUrl.toString(), pageTitle);

  return NextResponse.json({
    ...inferred,
    fetchOk,
  });
}
