import type { ReactNode } from "react";

type Tone = "success" | "warning" | "error" | "neutral";

export function IconBadge({
  children,
  tone = "neutral",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={`lc-icon-badge ${tone !== "neutral" ? `lc-icon-badge-${tone}` : ""} ${size === "sm" ? "lc-icon-badge-sm" : ""} ${className}`}
    >
      {children}
    </span>
  );
}
