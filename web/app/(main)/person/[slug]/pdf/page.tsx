import Link from "next/link";
import { notFound } from "next/navigation";
import { assertSafePathSegment } from "@/lib/paths";

export const dynamic = "force-dynamic";

type PdfKind = "resume" | "cover-letter";

function kindLabel(kind: PdfKind): string {
  return kind === "resume" ? "Resume PDF" : "Cover Letter PDF";
}

function fileUrl(person: string, company: string, role: string, kind: PdfKind): string {
  return `/api/files/${encodeURIComponent(person)}/${encodeURIComponent(company)}/${encodeURIComponent(role)}/${kind}?view=1`;
}

export default async function PdfViewerPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ company?: string; role?: string; kind?: string }>;
}>) {
  const { slug } = await params;
  const qp = await searchParams;
  const person = decodeURIComponent(slug);
  const company = typeof qp.company === "string" ? decodeURIComponent(qp.company) : "";
  const role = typeof qp.role === "string" ? decodeURIComponent(qp.role) : "";
  const kindRaw = typeof qp.kind === "string" ? qp.kind : "resume";
  const kind = (kindRaw === "cover-letter" ? "cover-letter" : "resume") as PdfKind;

  try {
    assertSafePathSegment(person, "person");
    assertSafePathSegment(company, "company");
    assertSafePathSegment(role, "role");
  } catch {
    notFound();
  }

  if (!company || !role) {
    notFound();
  }

  const viewerSrc = fileUrl(person, company, role, kind);
  const downloadSrc = viewerSrc.replace("?view=1", "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm shadow-slate-200/40">
        <div>
          <Link
            href={`/person/${encodeURIComponent(person)}?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}`}
            className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
          >
            ← Back to applications
          </Link>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {company.replaceAll("-", " ")} · {role.replaceAll("-", " ")}
          </p>
          <p className="text-xs text-slate-600">{kindLabel(kind)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/person/${encodeURIComponent(person)}/pdf?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&kind=resume`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              kind === "resume"
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
            }`}
          >
            Resume
          </Link>
          <Link
            href={`/person/${encodeURIComponent(person)}/pdf?company=${encodeURIComponent(company)}&role=${encodeURIComponent(role)}&kind=cover-letter`}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              kind === "cover-letter"
                ? "border-sky-300 bg-sky-50 text-sky-800"
                : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
            }`}
          >
            Cover letter
          </Link>
          <a
            href={downloadSrc}
            download
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-sky-200 hover:bg-sky-50/60"
          >
            Download
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md shadow-slate-200/40">
        <iframe
          src={viewerSrc}
          title={kindLabel(kind)}
          className="h-[calc(100vh-14rem)] w-full"
        />
      </div>
    </div>
  );
}
