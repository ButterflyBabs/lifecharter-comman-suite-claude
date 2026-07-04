import type { ReactNode } from "react";

export function IconBadge({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`lc-icon-badge ${className}`}>{children}</span>;
}
