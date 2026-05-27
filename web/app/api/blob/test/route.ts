import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

export async function POST() {
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
