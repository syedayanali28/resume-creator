import Link from "next/link";
import { scanPeopleIndex } from "@/lib/scan-people";

function displayName(slug: string): string {
  return slug.replaceAll("-", " ");
}

export default function HomePage() {
  const people = scanPeopleIndex();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-slate-900">People</h1>
        <Link
          href="/add"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          Add job
        </Link>
      </div>

      {people.length === 0 ? (
        <p className="text-sm text-slate-500">No people folders yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {people.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/person/${encodeURIComponent(p.slug)}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{displayName(p.slug)}</span>
                <span className="text-sm text-slate-500">
                  {p.companyCount} companies · {p.roleCount} jobs
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
