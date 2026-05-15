import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPersonDashboard } from "@/lib/scan-people";
import { RoleTable } from "./role-table";
import { TailorRunStatus } from "./tailor-run-status";

export const dynamic = "force-dynamic";

function prettifySlug(slug: string): string {
  return slug.replaceAll("-", " ");
}

export async function generateMetadata({
  params,
}: Readonly<{
  params: Promise<{ slug: string }>;
}>): Promise<Metadata> {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const dash = await getPersonDashboard(decoded);
  const name = prettifySlug(decoded);
  return {
    title: dash ? `${name} · Applications` : "Profile",
    description: `Application dashboard for ${name}.`,
  };
}

export default async function PersonPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ company?: string; role?: string }>;
}>) {
  const { slug } = await params;
  const qs = await searchParams;
  const decoded = decodeURIComponent(slug);
  const dashboard = await getPersonDashboard(decoded);
  if (!dashboard) {
    notFound();
  }

  const applied = dashboard.rows.filter((r) => r.appliedAt).length;
  const offers = dashboard.rows.filter((r) => r.status === "offer" || r.status === "accepted").length;
  const highlightKey =
    typeof qs.company === "string" && typeof qs.role === "string" && qs.company && qs.role
      ? `${qs.company}/${qs.role}`
      : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/"
            className="text-xs font-medium text-sky-700 hover:text-sky-900 hover:underline"
          >
            ← All profiles
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {prettifySlug(dashboard.slug)}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {dashboard.rows.length} application{dashboard.rows.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <StatChip label="Applied (dated)" value={String(applied)} />
          <StatChip label="Offer / accepted" value={String(offers)} />
        </div>
      </div>

      <section className="rounded-2xl border border-sky-100/80 bg-gradient-to-r from-sky-50/80 to-indigo-50/50 p-5 text-sm leading-relaxed text-slate-700 shadow-inner shadow-white/50">
        <p className="font-medium text-slate-800">Tracker fields</p>
        <p className="mt-2 text-slate-600">
          In each role folder, add{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">
            job description.txt
          </code>{" "}
          with optional YAML at the top:{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">posted</code>,{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">applied</code>,{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">status</code>,{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">note</code>,{" "}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs text-slate-800">link</code>.{" "}
          Status values: watching, ready_to_apply, applied, oa, interview, final, offer, accepted,
          rejected, withdrawn, closed.
        </p>
      </section>

      <TailorRunStatus personSlug={dashboard.slug} />

      <RoleTable personSlug={dashboard.slug} rows={dashboard.rows} highlightKey={highlightKey} />
    </div>
  );
}

function StatChip({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-2xl border border-white/90 bg-white px-4 py-3 shadow-sm shadow-slate-200/50">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
