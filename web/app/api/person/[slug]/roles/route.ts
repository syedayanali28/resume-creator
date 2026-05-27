import { NextResponse } from "next/server";
import { getPersonDashboard } from "@/lib/scan-people";
import { assertSafePathSegment } from "@/lib/paths";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
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
