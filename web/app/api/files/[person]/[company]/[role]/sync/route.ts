import { NextResponse } from "next/server";
import { getRolePdfAvailability } from "@/lib/pdf-availability";
import { isBlobConfigured } from "@/lib/blob-pdfs";
import { pdfApiUrl } from "@/lib/pdf-files";
import { assertSafePathSegment } from "@/lib/paths";
import { syncRolePdfsToBlob } from "@/lib/sync-role-pdfs-to-blob";

export const maxDuration = 60;

export async function POST(
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

  if (!isBlobConfigured()) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN is not set. Add it in Vercel project env and web/.env.local for remote PDF downloads.",
      },
      { status: 503 },
    );
  }

  const uploaded = await syncRolePdfsToBlob(person, company, role);
  const availability = await getRolePdfAvailability(person, company, role);

  return NextResponse.json({
    uploaded,
    hasResume: availability.hasResume,
    hasCover: availability.hasCover,
    resumeDownloadUrl: availability.hasResume
      ? pdfApiUrl(person, company, role, "resume")
      : null,
    coverDownloadUrl: availability.hasCover
      ? pdfApiUrl(person, company, role, "cover-letter")
      : null,
  });
}
