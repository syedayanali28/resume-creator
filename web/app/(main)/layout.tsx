import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  portalPasswordRequired,
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";
import { MainNav } from "./main-nav";
import { SignOutButton } from "./sign-out-button";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const needAuth = portalPasswordRequired();
  if (needAuth) {
    const token = (await cookies()).get(portalSessionCookieName())?.value;
    if (!verifyPortalSession(token)) {
      redirect("/login");
    }
  }

  return (
    <div className="min-h-full bg-[#eef2f9] text-slate-800">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/95 shadow-sm shadow-slate-200/40 backdrop-blur-md">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-base font-bold tracking-tight text-slate-950 hover:text-slate-800">
              Resume Creator
            </Link>
            <MainNav />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 md:inline-flex">
              People / Company / Role
            </span>
            {needAuth ? <SignOutButton /> : null}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
