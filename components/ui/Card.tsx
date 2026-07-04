import type { ReactNode } from "react";

export function Card({
  children,
  hover = false,
  className = "",
}: {
  children: ReactNode;
  hover?: boolean;
  className?: string;
}) {
  return (
    <div className={`lc-card ${hover ? "lc-card-hover" : ""} p-4 ${className}`}>
      {children}
    </div>
  );
}
