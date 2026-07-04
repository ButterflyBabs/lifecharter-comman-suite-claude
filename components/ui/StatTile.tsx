import type { ReactNode } from "react";
import { Card } from "./Card";
import { IconBadge } from "./IconBadge";

type Tone = "success" | "warning" | "error" | "neutral";

const TONE_COLOR: Record<Tone, string | undefined> = {
  success: "var(--success)",
  warning: "var(--warning)",
  error: "var(--error)",
  neutral: undefined,
};

const TONE_WASH: Record<Tone, string | undefined> = {
  success: "rgba(76, 175, 80, 0.14)",
  warning: "rgba(255, 152, 0, 0.14)",
  error: "rgba(231, 76, 60, 0.14)",
  neutral: undefined,
};

export function StatTile({
  value,
  label,
  tone = "neutral",
  icon,
}: {
  value: ReactNode;
  label: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  const color = TONE_COLOR[tone];
  const wash = TONE_WASH[tone];

  return (
    <Card
      hover
      className="flex items-center gap-3 text-sm"
      style={wash ? { background: `radial-gradient(140px circle at 100% -10%, ${wash}, transparent 70%), var(--card-bg)` } : undefined}
    >
      {icon && (
        <IconBadge tone={tone}>
          {icon}
        </IconBadge>
      )}
      <div>
        <p className="lc-title text-2xl" style={color ? { color } : undefined}>
          {value}
        </p>
        <p className="text-[var(--text-muted)]">{label}</p>
      </div>
    </Card>
  );
}
