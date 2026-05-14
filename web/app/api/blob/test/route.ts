import { put } from "@vercel/blob";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  portalPasswordRequired,
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";

export async function POST() {
  if (portalPasswordRequired()) {
    const token = (await cookies()).get(portalSessionCookieName())?.value;
    if (!verifyPortalSession(token)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const now = new Date().toISOString();
  const pathname = `debug/blob-test-${Date.now()}.txt`;
  const result = await put(pathname, `Blob test OK at ${now}\n`, {
    access: "public",
    addRandomSuffix: false,
    contentType: "text/plain; charset=utf-8",
  });

  return NextResponse.json({
    ok: true,
    pathname,
    url: result.url,
  });
}
