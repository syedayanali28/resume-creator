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
  const totalPeople = people.length;
  const totalCompanies = people.reduce((sum, p) => sum + p.companyCount, 0);
  const totalRoles = people.reduce((sum, p) => sum + p.roleCount, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-200/40 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Application profiles
            </h1>
          </div>
          <Link
            href="/cursor-tailor"
            className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sky-200 hover:bg-sky-50/60 hover:text-slate-900"
          >
            Open AI tailor
          </Link>
        </div>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="Profiles" value={totalPeople} />
          <StatCard label="Companies tracked" value={totalCompanies} />
          <StatCard label="Roles tracked" value={totalRoles} />
        </dl>
      </section>

      {people.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600">
          No applications found. Add folders under{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">people/</code> with a
          company folder and a role folder inside.
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/person/${encodeURIComponent(p.slug)}`}
                className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/40 transition hover:border-sky-200 hover:bg-sky-50/30"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
                  {initials(p.slug)}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-slate-900 group-hover:text-sky-800">
                    {prettifySlug(p.slug)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
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

function StatCard({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}
