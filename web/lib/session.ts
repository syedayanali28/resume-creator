import { createHmac, timingSafeEqual } from "crypto";

const COOKIE = "portal_session";

function secret(): string {
  return (
    process.env.PORTAL_SESSION_SECRET?.trim() ||
    process.env.PORTAL_PASSWORD?.trim() ||
    ""
  );
}

export function portalPasswordRequired(): boolean {
  return Boolean(process.env.PORTAL_PASSWORD?.trim());
}

export function verifyPortalSession(token: string | undefined): boolean {
  if (!portalPasswordRequired()) return true;
  const s = secret();
  if (!s || !token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  const expected = createHmac("sha256", s)
    .update(`portal|${expStr}`)
    .digest("hex");
  try {
    return timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export function createPortalSessionToken(): string {
  const s = secret();
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  const sig = createHmac("sha256", s).update(`portal|${exp}`).digest("hex");
  return `${exp}.${sig}`;
}

export function portalSessionCookieName(): typeof COOKIE {
  return COOKIE;
}
