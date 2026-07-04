import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createNurtureSequence, addNurtureStep } from "./actions";

export default async function MarketingPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Marketing" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: sequences } = await supabase
    .from("nurture_sequences")
    .select("id, name, audience, status")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const sequenceIds = (sequences ?? []).map((s) => s.id);
  const { data: steps } =
    sequenceIds.length > 0
      ? await supabase
          .from("nurture_steps")
          .select("id, sequence_id, step_order, delay_period, channel")
          .in("sequence_id", sequenceIds)
          .order("step_order")
      : { data: null };

  const stepsBySequence = new Map<string, NonNullable<typeof steps>>();
  for (const s of steps ?? []) {
    if (!stepsBySequence.has(s.sequence_id)) stepsBySequence.set(s.sequence_id, []);
    stepsBySequence.get(s.sequence_id)!.push(s);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Marketing"
        description="Plan demand generation, audiences, channels, nurture, and attribution."
      />

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/revenue/campaigns" className="lc-btn-secondary">Channel plans → Campaigns</Link>
        <Link href="/revenue/content" className="lc-btn-secondary">Content and assets</Link>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Nurture sequences</h2>
        {sequences && sequences.length > 0 && (
          <ul className="mt-2 space-y-3">
            {sequences.map((s) => (
              <li key={s.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{s.name}</p>
                    <StatusBadge status={s.status} />
                  </div>
                  <p className="text-soft-taupe">{s.audience ?? "—"}</p>

                  {(stepsBySequence.get(s.id) ?? []).length > 0 && (
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {(stepsBySequence.get(s.id) ?? []).map((step) => (
                        <li key={step.id} className="text-xs text-soft-taupe">
                          {step.channel ?? "—"} · {step.delay_period ?? "no delay"}
                        </li>
                      ))}
                    </ol>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-deep-indigo underline">Add step</summary>
                    <form action={addNurtureStep} className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input type="hidden" name="sequence_id" value={s.id} />
                      <input type="number" name="step_order" placeholder="Order" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <input type="text" name="channel" placeholder="Channel" className="rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <input type="text" name="delay_period" placeholder="Delay (e.g. 2 days)" className="rounded border border-soft-taupe px-2 py-1 text-xs sm:col-span-2" />
                      <input type="text" name="owner_rule" placeholder="Owner rule" className="rounded border border-soft-taupe px-2 py-1 text-xs sm:col-span-2" />
                      <button type="submit" className="lc-btn-secondary text-xs sm:col-span-2">Add step</button>
                    </form>
                  </details>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Create nurture sequence</summary>
          <form action={createNurtureSequence} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Sequence name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="audience" placeholder="Audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="trigger_rule" placeholder="Trigger" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="stop_conditions" placeholder="Stop conditions" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-secondary">Create sequence</button>
          </form>
        </details>
      </section>
    </div>
  );
}
