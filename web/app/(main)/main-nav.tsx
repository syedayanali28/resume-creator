"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/add", label: "Add job" },
  { href: "/history", label: "History" },
] as const;

export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
