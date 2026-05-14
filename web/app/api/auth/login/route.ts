import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import {
  createPortalSessionToken,
  portalPasswordRequired,
  portalSessionCookieName,
} from "@/lib/session";

function safeEqualPassword(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(request: Request) {
  if (!portalPasswordRequired()) {
    return NextResponse.json({ ok: true });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password =
    typeof body === "object" &&
    body !== null &&
    "password" in body &&
    typeof (body as { password: unknown }).password === "string"
      ? (body as { password: string }).password
      : "";

  const expected = process.env.PORTAL_PASSWORD!.trim();
  if (!safeEqualPassword(password, expected)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createPortalSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(portalSessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}
