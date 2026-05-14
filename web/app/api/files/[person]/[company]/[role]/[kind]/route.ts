import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getBlobPdfUrl } from "@/lib/blob-pdfs";
import { assertSafePathSegment, getPeopleRoot } from "@/lib/paths";
import {
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";

type Kind = "resume" | "cover-letter";

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ person: string; company: string; role: string; kind: string }>;
  },
) {
  const token = (await cookies()).get(portalSessionCookieName())?.value;
  if (!verifyPortalSession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { person, company, role, kind: kindRaw } = await context.params;
  try {
    assertSafePathSegment(person, "person");
    assertSafePathSegment(company, "company");
    assertSafePathSegment(role, "role");
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const kind = kindRaw as Kind;
  if (kind !== "resume" && kind !== "cover-letter") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const peopleRoot = path.resolve(getPeopleRoot());
  const roleDir = path.resolve(peopleRoot, person, company, role);
  if (!roleDir.startsWith(peopleRoot + path.sep)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stem = `${person}_${company}_${role}`;
  const filename =
    kind === "resume" ? `${stem}_resume.pdf` : `${stem}_cover-letter.pdf`;
  const abs = path.join(roleDir, filename);

  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    const blobUrl = await getBlobPdfUrl(person, company, role, kind);
    if (!blobUrl) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const upstream = await fetch(blobUrl, { cache: "no-store" });
    if (!upstream.ok) {
      return NextResponse.json({ error: "Blob fetch failed" }, { status: 502 });
    }

    const bytes = await upstream.arrayBuffer();
    const headers = new Headers();
    const safeAsciiName = filename.replace(/[^\x20-\x7E]/g, "_");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeAsciiName.replaceAll('"', "")}"`,
    );
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Length", String(bytes.byteLength));
    return new NextResponse(bytes, { status: 200, headers });
  }

  const buf = fs.readFileSync(abs);
  const headers = new Headers();
  const safeAsciiName = filename.replace(/[^\x20-\x7E]/g, "_");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${safeAsciiName.replaceAll('"', "")}"`,
  );
  headers.set("Content-Type", "application/pdf");
  headers.set("Content-Length", String(buf.length));
  return new NextResponse(buf, { status: 200, headers });
}
