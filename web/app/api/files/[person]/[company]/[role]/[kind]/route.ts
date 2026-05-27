import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getBlobPdfUrl } from "@/lib/blob-pdfs";
import { githubRawPdfUrl } from "@/lib/github-raw-pdf";
import { pdfFilename, rolePdfAbsPath, type PdfKind } from "@/lib/pdf-files";
import { assertSafePathSegment, getPeopleRoot } from "@/lib/paths";

type Kind = PdfKind;

export async function GET(
  request: Request,
  context: {
    params: Promise<{ person: string; company: string; role: string; kind: string }>;
  },
) {
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

  const filename = pdfFilename(person, company, role, kind);
  const abs = rolePdfAbsPath(person, company, role, kind);
  const query = new URL(request.url).searchParams;
  const viewMode = query.get("view") === "1";
  const disposition = viewMode ? "inline" : "attachment";

  const safeAsciiName = filename.replace(/[^\x20-\x7E]/g, "_");
  const contentDisposition = `${disposition}; filename="${safeAsciiName.replaceAll('"', "")}"`;

  function pdfResponse(data: Buffer | ArrayBuffer): NextResponse {
    const body = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const headers = new Headers();
    headers.set("Content-Disposition", contentDisposition);
    headers.set("Content-Type", "application/pdf");
    headers.set("Content-Length", String(body.length));
    return new NextResponse(new Uint8Array(body), { status: 200, headers });
  }

  const blobUrl = await getBlobPdfUrl(person, company, role, kind);
  if (blobUrl) {
    const upstream = await fetch(blobUrl, { cache: "no-store" });
    if (upstream.ok) {
      return pdfResponse(await upstream.arrayBuffer());
    }
  }

  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    return pdfResponse(fs.readFileSync(abs));
  }

  const upstreamUrl = githubRawPdfUrl(person, company, role, kind);
  if (upstreamUrl) {
    const upstream = await fetch(upstreamUrl, { cache: "no-store" });
    if (upstream.ok) {
      return pdfResponse(await upstream.arrayBuffer());
    }
  }

  if (!blobUrl && !upstreamUrl) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ error: "PDF fetch failed" }, { status: 502 });
}
