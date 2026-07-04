"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/navigation";

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="w-64 shrink-0 border-r border-[var(--card-border)] bg-[var(--card-bg)] p-4">
      <ul className="space-y-1">
        {PRIMARY_NAV.map((item) => {
          const section = "/" + item.href.split("/")[1];
          const isActive = pathname?.startsWith(section);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`lc-nav-link text-sm ${isActive ? "active" : ""}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
