import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  hover = false,
  className = "",
  style,
}: {
  children: ReactNode;
  hover?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`lc-card ${hover ? "lc-card-hover" : ""} p-4 ${className}`} style={style}>
      {children}
    </div>
  );
}
