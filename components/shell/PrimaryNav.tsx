"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/navigation";
import {
  IconCompass,
  IconMap,
  IconBuilding,
  IconTrendingUp,
  IconUsers,
  IconGauge,
  IconClipboard,
  IconCpu,
  IconBookOpen,
  IconSettings,
  IconChevronLeft,
} from "@/components/ui/icons";

const NAV_ICONS: Record<string, () => JSX.Element> = {
  "/command/today": IconCompass,
  "/roadmap/setup": IconMap,
  "/architecture/founder": IconBuilding,
  "/revenue/overview": IconTrendingUp,
  "/clients/overview": IconUsers,
  "/operations/overview": IconGauge,
  "/reviews/daily": IconClipboard,
  "/ai/overview": IconCpu,
  "/library/business-brain": IconBookOpen,
  "/settings/workspace": IconSettings,
};

const STORAGE_KEY = "lc-nav-collapsed";

export function PrimaryNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Read the saved preference after mount only — localStorage isn't
  // available during server rendering, and reading it in the initial
  // useState() would crash SSR. One extra render on mount is an
  // acceptable tradeoff for a purely cosmetic layout preference.
  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <nav
      aria-label="Primary"
      className={`shrink-0 border-r border-[var(--card-border)] bg-[var(--card-bg)] transition-[width] duration-150 ${collapsed ? "w-[72px] p-2" : "w-64 p-4"}`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
        className={`mb-3 flex w-full items-center gap-2 rounded p-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal ${collapsed ? "justify-center" : "justify-end"}`}
      >
        <span className={`transition-transform duration-150 ${collapsed ? "rotate-180" : ""}`}>
          <IconChevronLeft />
        </span>
      </button>

      <ul className="space-y-1">
        {PRIMARY_NAV.map((item) => {
          const section = "/" + item.href.split("/")[1];
          const isActive = pathname?.startsWith(section);
          const Icon = NAV_ICONS[item.href];
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`lc-nav-link text-sm ${isActive ? "active" : ""} ${collapsed ? "justify-center !px-2" : ""}`}
              >
                {Icon && <span className="shrink-0"><Icon /></span>}
                <span className={collapsed ? "sr-only" : ""}>{item.label}</span>
                {collapsed && (
                  <span className="lc-nav-tooltip" aria-hidden="true">
                    {item.label}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
