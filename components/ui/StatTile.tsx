import type { ReactNode } from "react";

type Tone = "success" | "warning" | "error" | "neutral";

const TONE_COLOR: Record<Tone, string | undefined> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  neutral: undefined,
};

export function StatTile({
  value,
  label,
  tone = "neutral",
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
}) {
  const color = TONE_COLOR[tone];
  return (
    <div className="lc-card lc-card-hover p-4 text-sm">
      <p className="lc-title text-2xl" style={color ? { color } : undefined}>
        {value}
      </p>
      <p className="text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
