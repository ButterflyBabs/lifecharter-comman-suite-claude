import type { ReactNode } from "react";

export function StatTile({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="lc-card p-4 text-sm">
      <p className="lc-title text-2xl">{value}</p>
      <p className="text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
