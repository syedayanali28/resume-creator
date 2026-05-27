import Link from "next/link";
import { MainNav } from "./main-nav";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-full bg-slate-100 text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-slate-900">
              Resume Creator
            </Link>
            <MainNav />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
