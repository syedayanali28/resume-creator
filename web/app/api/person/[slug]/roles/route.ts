import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getPersonDashboard } from "@/lib/scan-people";
import { assertSafePathSegment } from "@/lib/paths";
import {
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (!verifyPortalSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await context.params;
  try {
    assertSafePathSegment(slug, "person");
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dashboard = await getPersonDashboard(slug);
  if (!dashboard) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const applications = dashboard.rows.map((r) => ({
    companySlug: r.companySlug,
    roleSlug: r.roleSlug,
  }));

  return NextResponse.json({ slug, applications });
}
