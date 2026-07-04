"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/navigation";

export function PrimaryNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="border-r border-soft-taupe/30 p-4">
      <ul className="space-y-1">
        {PRIMARY_NAV.map((item) => {
          const section = "/" + item.href.split("/")[1];
          const isActive = pathname?.startsWith(section);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal ${
                  isActive ? "bg-accent font-medium text-white" : "text-deep-indigo hover:bg-soft-lavender/30"
                }`}
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
