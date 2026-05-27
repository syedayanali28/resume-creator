import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPersonDashboard } from "@/lib/scan-people";
import { RoleTable } from "./role-table";

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
    title: dash ? name : "Profile",
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

  const highlightKey =
    typeof qs.company === "string" && typeof qs.role === "string" && qs.company && qs.role
      ? `${qs.company}/${qs.role}`
      : undefined;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
          ← People
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-slate-900">
          {prettifySlug(dashboard.slug)}
        </h1>
      </div>

      <RoleTable personSlug={dashboard.slug} rows={dashboard.rows} highlightKey={highlightKey} />
    </div>
  );
}
