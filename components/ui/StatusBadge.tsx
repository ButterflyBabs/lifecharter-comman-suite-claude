type Tone = "success" | "warning" | "error" | "neutral";

const STATUS_TONE: Record<string, Tone> = {
  done: "success",
  complete: "success",
  completed: "success",
  approved: "success",
  achieved: "success",
  granted: "success",
  active: "warning",
  in_progress: "warning",
  pending: "warning",
  open: "warning",
  restricted: "warning",
  cancelled: "error",
  rejected: "error",
  blocked: "error",
  missed: "error",
  abandoned: "error",
  prohibited: "error",
  revoked: "error",
  retired: "error",
  not_started: "neutral",
  draft: "neutral",
};

export function StatusBadge({ status, tone }: { status: string; tone?: Tone }) {
  const resolvedTone = tone ?? STATUS_TONE[status] ?? "neutral";
  return <span className={`lc-badge lc-badge-${resolvedTone}`}>{status.replace(/_/g, " ")}</span>;
}
