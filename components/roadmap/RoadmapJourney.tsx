import { Card } from "@/components/ui";

// A persistent "where am I in this process" tracker for /roadmap/plan. Shows the
// four stages of the Business Command Audit journey, which one is current, and a
// plain-language "next step" so the client always knows what to do.
const STEPS = [
  { n: 1, label: "Take the audit", desc: "Score the 12 business areas" },
  { n: 2, label: "Review findings", desc: "See your scores, gaps, and risks" },
  { n: 3, label: "Approve roadmap", desc: "Turn findings into a plan" },
  { n: 4, label: "Work the plan", desc: "Complete milestones, phase by phase" },
];

export function RoadmapJourney({
  stage,
  next,
  auditPct,
}: {
  stage: number;
  next: string;
  auditPct?: number | null;
}) {
  const fill = Math.max(0, Math.min(100, ((stage - 1) / (STEPS.length - 1)) * 100));

  return (
    <Card className="mt-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Your roadmap journey</p>
        <p className="text-xs text-soft-taupe">
          Step {Math.min(stage, STEPS.length)} of {STEPS.length}
        </p>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
        <div className="h-full rounded-full bg-warm-gold transition-[width]" style={{ width: `${fill}%` }} />
      </div>

      <ol className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-4">
        {STEPS.map((s) => {
          const done = s.n < stage;
          const active = s.n === stage;
          return (
            <li
              key={s.n}
              className={"rounded-xl border p-3 " + (active ? "border-warm-gold bg-warm-gold/5" : "border-[var(--card-border)]")}
            >
              <div className="flex items-center gap-2">
                <span
                  className={
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold " +
                    (done
                      ? "bg-[var(--success)] text-white"
                      : active
                        ? "bg-warm-gold text-[var(--ink-on-gold)]"
                        : "border border-soft-taupe text-soft-taupe")
                  }
                >
                  {done ? "✓" : s.n}
                </span>
                <span className={"text-sm font-medium " + (active || done ? "text-deep-indigo" : "text-soft-taupe")}>
                  {s.label}
                </span>
              </div>
              <p className="mt-1 text-xs text-soft-taupe">
                {s.n === 1 && typeof auditPct === "number" && stage <= 1 ? `${auditPct}% complete` : s.desc}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 rounded-lg bg-[var(--card-bg-hover)] px-3 py-2 text-sm text-deep-indigo">
        <span className="font-medium">Next step:</span> {next}
      </p>
    </Card>
  );
}
