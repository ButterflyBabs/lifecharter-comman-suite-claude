import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { startAudit } from "@/app/(app)/roadmap/audit/actions";
import { reopenAudit } from "./actions";
import { RoadmapExecutionView } from "@/components/roadmap/RoadmapExecutionView";
import { Card, PageHeader, StatTile, IconGauge, IconFlag, IconCompass } from "@/components/ui";

type PerDomainScore = {
  domain_id: string;
  domain_name: string;
  build_completion: number;
  operating_health: number;
  average: number;
  severity: string;
};

function scoreTone(score: number): "success" | "warning" | "error" | "neutral" {
  if (score >= 80) return "success";
  if (score >= 60) return "neutral";
  if (score >= 40) return "warning";
  return "error";
}

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function addMonths(d: string | null, months: number) {
  if (!d) return null;
  const date = new Date(d);
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

export default async function RoadmapPlanPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Roadmap</h1>
        <p className="mt-2 text-sm text-soft-taupe">
          <Link href="/roadmap/setup" className="underline">
            Set up your workspace
          </Link>{" "}
          first.
        </p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: domains } = await supabase
    .from("business_command_domains")
    .select("id, name, description, display_order")
    .eq("active", true)
    .order("display_order");

  const { data: instance } = await supabase
    .from("audit_instances")
    .select("id, status, created_at, updated_at, period_end")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // ---------------------------------------------------------------- State A
  if (!instance) {
    return (
      <div className="max-w-4xl p-8">
        <PageHeader
          title="Your Business Command Audit"
          description="A structured review of the twelve areas that determine whether your business runs on you or on systems. It takes about 25–35 minutes, autosaves as you go, and you can attach evidence for any answer. Your responses feed the AI that builds your prioritized Roadmap — the AI interprets and explains, it never invents your scores."
        />

        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">What you'll get</h2>
          <ul className="mt-2 space-y-1 text-sm text-soft-taupe">
            <li>• An overall build-completion and operating-health score across all twelve areas.</li>
            <li>• Your top gaps, contradictions, and strengths, explained in plain language.</li>
            <li>• A prioritized Roadmap that sequences the work from your lowest-scoring areas first.</li>
          </ul>
          <form action={startAudit} className="mt-5">
            <button
              type="submit"
              className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
            >
              Start My Business Command Audit
            </button>
          </form>
        </Card>

        {/* Muted, non-interactive 12-phase preview */}
        <p className="mt-8 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          The twelve areas you'll assess
        </p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
          {(domains ?? []).map((d) => (
            <li
              key={d.id}
              aria-disabled="true"
              className="rounded-xl border border-[var(--card-border)] p-3 opacity-70"
            >
              <p className="text-sm font-medium text-deep-indigo">
                {d.display_order}. {d.name}
              </p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  // Load the deterministic snapshot + narrative for findings states.
  const { data: summary } = await supabase
    .from("audit_findings_summary")
    .select("overall_score, per_domain_scores, top_gaps, approved_at")
    .eq("audit_instance_id", instance.id)
    .maybeSingle();

  const perDomain = (summary?.per_domain_scores as PerDomainScore[] | null) ?? [];
  const topGaps = [...perDomain].sort((a, b) => a.average - b.average).slice(0, 3);
  const overall = summary?.overall_score ?? 0;

  const roadmapExists = instance.status === "findings_approved";
  const showState: "B" | "C" | "D" =
    instance.status === "in_progress"
      ? "B"
      : instance.status === "findings_approved"
        ? "D"
        : "C"; // findings_pending or legacy 'completed'

  // ---------------------------------------------------------------- State B
  if (showState === "B") {
    const { data: template } = await supabase
      .from("audit_templates")
      .select("id")
      .eq("name", "Business Command Audit — Standard")
      .single();

    const { data: questions } = await supabase
      .from("audit_questions")
      .select("id, domain_id")
      .eq("audit_template_id", template!.id);

    const { data: responses } = await supabase
      .from("audit_responses")
      .select("question_id")
      .eq("audit_instance_id", instance.id);

    const answered = new Set((responses ?? []).map((r) => r.question_id));
    const total = questions?.length ?? 0;
    const answeredCount = (questions ?? []).filter((q) => answered.has(q.id)).length;
    const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;

    const byDomain = new Map<string, { total: number; done: number }>();
    for (const q of questions ?? []) {
      const e = byDomain.get(q.domain_id) ?? { total: 0, done: 0 };
      e.total += 1;
      if (answered.has(q.id)) e.done += 1;
      byDomain.set(q.domain_id, e);
    }
    const areasComplete = [...byDomain.values()].filter((e) => e.total > 0 && e.done === e.total).length;

    return (
      <div className="max-w-4xl p-8">
        <PageHeader title="Your Business Command Audit" description="You have an audit in progress." />
        <Card className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-deep-indigo">{pct}% complete</span>
            <span className="text-[var(--text-muted)]">Last saved {fmtDate(instance.updated_at)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--card-bg-hover)]">
            <div className="h-full rounded-full bg-warm-gold transition-[width]" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-soft-taupe">
            {areasComplete} of {domains?.length ?? 12} areas complete.
          </p>
          <Link
            href="/roadmap/audit"
            className="lc-btn-primary mt-5 inline-block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
          >
            Resume
          </Link>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------- State C
  if (showState === "C") {
    return (
      <div className="max-w-4xl p-8">
        <PageHeader
          title="Your findings are ready to review"
          description="We've scored every area from your answers and drafted your findings. Review and approve them to generate your prioritized Roadmap."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatTile value={`${overall}%`} label="Overall score" tone={scoreTone(overall)} icon={<IconGauge />} />
          <StatTile value={topGaps.length} label="Top gaps identified" tone="warning" icon={<IconFlag />} />
          <StatTile value={domains?.length ?? 12} label="Areas assessed" tone="neutral" icon={<IconCompass />} />
        </div>

        <Card className="mt-4">
          <h2 className="text-lg font-semibold text-deep-indigo">Your top 3 gaps</h2>
          <ul className="mt-2 space-y-2">
            {topGaps.map((g) => (
              <li key={g.domain_id} className="border-t border-[var(--card-border)] pt-2 first:border-t-0 first:pt-0">
                <p className="text-sm font-medium text-deep-indigo">{g.domain_name}</p>
                <p className="text-xs text-soft-taupe">
                  Build {g.build_completion}% · Health {g.operating_health}%
                </p>
              </li>
            ))}
            {topGaps.length === 0 && <li className="text-sm text-soft-taupe">Findings are being prepared.</li>}
          </ul>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            Approving your findings locks in this assessment and builds your Roadmap. You can still update your answers
            first.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/roadmap/findings"
              className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
            >
              Review My Findings
            </Link>
            <form action={reopenAudit.bind(null, instance.id)}>
              <button
                type="submit"
                className="rounded border border-soft-taupe px-4 py-2 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
              >
                Update My Answers
              </button>
            </form>
          </div>
        </Card>
      </div>
    );
  }

  // ---------------------------------------------------------------- State D
  return (
    <div className="max-w-4xl p-8">
      <PageHeader
        title="Your Roadmap is ready"
        description="Your findings are approved and your prioritized Roadmap is live below."
        actions={
          <form action={startAudit}>
            <button
              type="submit"
              className="rounded border border-soft-taupe px-4 py-2 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
            >
              Start reassessment
            </button>
          </form>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div
          className="flex h-20 w-20 flex-col items-center justify-center rounded-full text-white"
          style={{ background: "var(--deep-indigo, #1e1b4b)" }}
        >
          <span className="text-2xl font-semibold">{overall}%</span>
          <span className="text-[10px] uppercase tracking-wide opacity-80">Overall</span>
        </div>
        <div className="text-sm text-soft-taupe">
          <p>Last assessed: {fmtDate(summary?.approved_at ?? instance.period_end ?? instance.updated_at)}</p>
          <p>Next assessment: {fmtDate(addMonths(summary?.approved_at ?? instance.updated_at, 3))}</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-semibold text-deep-indigo">Your top 3 priority gaps</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {topGaps.map((g) => (
          <Card key={g.domain_id}>
            <p className="text-sm font-medium text-deep-indigo">{g.domain_name}</p>
            <p className="mt-1 text-xs text-soft-taupe">
              Build {g.build_completion}% · Health {g.operating_health}%
            </p>
          </Card>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/roadmap/plan#phases"
          className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          View My Roadmap
        </Link>
        <Link
          href="/roadmap/findings"
          className="rounded border border-soft-taupe px-4 py-2 text-sm text-deep-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-indigo"
        >
          View Full Report
        </Link>
      </div>

      {roadmapExists && <RoadmapExecutionView workspaceId={workspaceId} />}
    </div>
  );
}
