import { createClient } from "@/lib/supabase/server";
import { SnapshotAudit, type SnapshotPhase } from "@/components/roadmap/SnapshotAudit";

export const metadata = {
  title: "Free Business Command Audit — LifeCharter",
  description: "A 5-minute snapshot of how built-out and healthy your business systems are, across the twelve Business Command areas.",
};

// Public, unauthenticated lead-magnet snapshot. Snapshot questions are readable
// by anon via RLS (include_in_snapshot = true); submissions go through the
// submit_public_audit_snapshot RPC. No workspace/session involved.
export default async function PublicBusinessCommandAuditPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("audit_questions")
    .select("id, prompt, display_order, score_category, business_command_domains(id, name, display_order)")
    .eq("include_in_snapshot", true);

  const byPhase = new Map<string, SnapshotPhase>();
  for (const r of (rows ?? []) as any[]) {
    const d = r.business_command_domains;
    if (!d) continue;
    if (!byPhase.has(d.id)) {
      byPhase.set(d.id, { id: d.id, name: d.name, order: d.display_order, questions: [] });
    }
    byPhase.get(d.id)!.questions.push({
      id: r.id,
      prompt: r.prompt,
      displayOrder: r.display_order ?? 0,
      scoreCategory: r.score_category,
    });
  }

  const phases = [...byPhase.values()].sort((a, b) => a.order - b.order);
  for (const p of phases) p.questions.sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <SnapshotAudit phases={phases} />
    </main>
  );
}
