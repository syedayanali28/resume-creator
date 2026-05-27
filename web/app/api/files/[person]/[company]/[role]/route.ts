import { NextResponse } from "next/server";
import { getRolePdfAvailability } from "@/lib/pdf-availability";
import { pdfApiUrl } from "@/lib/pdf-files";
import { assertSafePathSegment } from "@/lib/paths";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ person: string; company: string; role: string }>;
  },
) {
  const { person, company, role } = await context.params;
  try {
    assertSafePathSegment(person, "person");
    assertSafePathSegment(company, "company");
    assertSafePathSegment(role, "role");
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const availability = await getRolePdfAvailability(person, company, role);
  return NextResponse.json({
    hasResume: availability.hasResume,
    hasCover: availability.hasCover,
    resumeDownloadUrl: availability.hasResume
      ? pdfApiUrl(person, company, role, "resume")
      : null,
    coverDownloadUrl: availability.hasCover
      ? pdfApiUrl(person, company, role, "cover-letter")
      : null,
    resumeViewUrl: availability.hasResume
      ? pdfApiUrl(person, company, role, "resume", { inline: true })
      : null,
    coverViewUrl: availability.hasCover
      ? pdfApiUrl(person, company, role, "cover-letter", { inline: true })
      : null,
  });
}
