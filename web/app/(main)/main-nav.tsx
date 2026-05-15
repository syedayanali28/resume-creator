"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/cursor-tailor", label: "AI Tailor" },
  { href: "/runs", label: "Active Runs" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-full border border-sky-700 bg-sky-700 px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-sky-900/25"
                : "rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm font-semibold text-slate-800 hover:border-slate-400 hover:bg-slate-50"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
