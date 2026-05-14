import Link from "next/link";
import { scanPeopleIndex } from "@/lib/scan-people";

function initials(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts[1]?.[0] ?? (parts[0]?.[1] ?? "");
  return (a + b).toUpperCase();
}

function prettifySlug(slug: string): string {
  return slug.replaceAll("-", " ");
}

export default function HomePage() {
  const people = scanPeopleIndex();

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white to-slate-50/90 p-8 shadow-lg shadow-slate-200/60 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600/90">
          Pipeline
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Pick a profile
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Each person has their own dashboard: posting dates, when you applied, status, and
          quick downloads for tailored PDFs. Layout on disk:{" "}
          <code className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800">
            people/&lt;Person&gt;/&lt;Company&gt;/&lt;Role&gt;/
          </code>
          .
        </p>
      </section>

      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white/60 px-6 py-12 text-center text-sm text-slate-600">
          No applications found. Add folders under{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">people/</code> with a
          company folder and a role folder inside.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/person/${encodeURIComponent(p.slug)}`}
                className="group flex items-center gap-4 rounded-2xl border border-white/90 bg-white p-5 shadow-md shadow-slate-200/50 transition hover:-translate-y-0.5 hover:border-sky-200/80 hover:shadow-lg hover:shadow-sky-100/60"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-sm font-bold text-white shadow-inner shadow-sky-900/20">
                  {initials(p.slug)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold text-slate-900 group-hover:text-sky-800">
                    {prettifySlug(p.slug)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {p.companyCount} compan{p.companyCount === 1 ? "y" : "ies"} · {p.roleCount}{" "}
                    role{p.roleCount === 1 ? "" : "s"}
                  </p>
                </div>
                <span
                  className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-sky-500"
                  aria-hidden
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
