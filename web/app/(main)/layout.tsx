import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  portalPasswordRequired,
  portalSessionCookieName,
  verifyPortalSession,
} from "@/lib/session";
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
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/85 shadow-sm shadow-slate-200/40 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold tracking-tight text-slate-900 hover:text-slate-700"
            >
              Application desk
            </Link>
            <span className="hidden text-xs font-medium uppercase tracking-wider text-slate-400 sm:inline">
              People → Company → Role
            </span>
          </div>
          {needAuth ? <SignOutButton /> : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
