"use client";

import type { ApplicationStatus } from "@/lib/application-status";
import { statusBadgeClass, statusLabel } from "@/lib/application-status";
import type { RoleApplicationRow } from "@/lib/scan-people";

function fileUrl(
  person: string,
  company: string,
  role: string,
  kind: "resume" | "cover-letter",
) {
  return `/api/files/${encodeURIComponent(person)}/${encodeURIComponent(company)}/${encodeURIComponent(role)}/${kind}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function RoleTable({
  personSlug,
  rows,
}: Readonly<{
  personSlug: string;
  rows: RoleApplicationRow[];
}>) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-600">
        No role folders yet for this person.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="whitespace-nowrap px-4 py-3">Company</th>
              <th className="whitespace-nowrap px-4 py-3">Role</th>
              <th className="whitespace-nowrap px-4 py-3">Posted</th>
              <th className="whitespace-nowrap px-4 py-3">Applied</th>
              <th className="whitespace-nowrap px-4 py-3">Status</th>
              <th className="min-w-[140px] px-4 py-3">Updates</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Resume</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Cover</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => {
              const key = `${row.companySlug}/${row.roleSlug}`;
              const open = Boolean(row.link);
              return (
                <tr
                  key={key}
                  onClick={() => {
                    if (row.link) {
                      globalThis.open(row.link, "_blank", "noopener,noreferrer");
                    }
                  }}
                  className={
                    open
                      ? "cursor-pointer transition-colors hover:bg-sky-50/50"
                      : "cursor-default bg-white"
                  }
                  title={
                    open
                      ? "Open job posting in a new tab"
                      : "Add link in job description front matter or a job link file"
                  }
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {row.companySlug.replaceAll("-", " ")}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="line-clamp-2">{row.roleSlug.replaceAll("-", " ")}</span>
                    {!row.hasJobDescription && (
                      <span className="mt-1 block text-xs font-normal text-amber-700">
                        Add job description.txt
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 tabular-nums">
                    {fmtDate(row.postedAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600 tabular-nums">
                    {fmtDate(row.appliedAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="max-w-[220px] px-4 py-3 text-slate-600">
                    {row.note ? (
                      <span className="line-clamp-2 text-xs leading-relaxed">{row.note}</span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.hasResumePdf ? (
                      <a
                        href={fileUrl(personSlug, row.companySlug, row.roleSlug, "resume")}
                        download
                        className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm hover:border-sky-200 hover:bg-sky-50/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.hasCoverPdf ? (
                      <a
                        href={fileUrl(personSlug, row.companySlug, row.roleSlug, "cover-letter")}
                        download
                        className="inline-flex rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 shadow-sm hover:border-sky-200 hover:bg-sky-50/80"
                        onClick={(e) => e.stopPropagation()}
                      >
                        PDF
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({ status }: Readonly<{ status: ApplicationStatus }>) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusBadgeClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}
