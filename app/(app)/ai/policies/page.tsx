import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";

const PERMISSION_LADDER = [
  { level: "Read and Analyze", description: "Summarize, classify, compare, detect gaps, and explain." },
  { level: "Draft", description: "Create messages, plans, tasks, notes, proposals, summaries, and recommendations." },
  { level: "Prepare Actions", description: "Prepare campaigns, automations, updates, or communications for review." },
  { level: "Execute Low-Risk Internal Actions", description: "Create approved internal tasks, update allowed internal status, synchronize approved records, and generate reports." },
  { level: "Human Approval Required", description: "External messages, publishing, contracts, payments, refunds, pricing changes, sensitive client communications, deletions, and material automation changes." },
];

const APPROVAL_MATRIX = [
  { action: "Internal summary", prepare: "Yes", execute: "Yes, when permission-safe" },
  { action: "Internal task suggestion", prepare: "Yes", execute: "Yes, when reversible and policy-approved" },
  { action: "Assign approved internal task", prepare: "Yes", execute: "Yes, under configured rule" },
  { action: "Update low-risk internal tag", prepare: "Yes", execute: "Yes, under configured rule" },
  { action: "External email or message", prepare: "Yes", execute: "No by default" },
  { action: "Publish content", prepare: "Yes", execute: "No" },
  { action: "Change price or offer scope", prepare: "Yes", execute: "No" },
  { action: "Send proposal or contract", prepare: "Yes", execute: "No" },
  { action: "Sign agreement", prepare: "No", execute: "No" },
  { action: "Charge payment method", prepare: "Prepare only", execute: "No" },
  { action: "Issue refund", prepare: "Prepare only", execute: "No" },
  { action: "Change permissions", prepare: "Recommend only", execute: "No" },
  { action: "Delete or bulk archive", prepare: "Recommend only", execute: "No" },
  { action: "Change client health from inference", prepare: "Recommend only", execute: "No" },
  { action: "Activate high-risk automation", prepare: "Prepare and test", execute: "No" },
  { action: "Resolve source-of-truth conflict", prepare: "Recommend", execute: "No unless deterministic rule is preapproved" },
];

const OUTPUT_CONTRACT = [
  "Label the output as draft, recommendation, summary, or system action.",
  "Identify authorized source records used.",
  "Separate verified fact, user-supplied information, reasonable inference, and missing information.",
  "Never invent people, contact information, relationships, facts, pricing, outcomes, dates, or commitments.",
  "Preserve original output, human edits, decision, approver, and timestamp.",
  "Use deterministic rules for priority and next-best-action logic before AI explanation.",
  "Do not infer sensitive protected information.",
  "Allow safe retry without duplicating external or financial actions.",
];

export default async function PoliciesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="AI Policies" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: agents } = await supabase
    .from("ai_agents")
    .select("id, name, status, current_version_id, ai_agent_versions(id, permission_level)")
    .eq("workspace_id", workspaceId);

  return (
    <div className="p-8">
      <PageHeader
        title="AI Policies"
        description="The permission ladder and output contract every agent in this workspace operates under."
      />

      {agents && agents.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold text-deep-indigo">Agents by approval policy</h2>
          <ul className="mt-3 space-y-2">
            {agents.map((a) => {
              const versions = a.ai_agent_versions as unknown as { id: string; permission_level: string }[];
              const current = versions.find((v) => v.id === a.current_version_id);
              return (
                <li key={a.id}>
                  <Card className="flex items-center justify-between text-sm">
                    <span>{a.name}</span>
                    <div className="flex items-center gap-2">
                      {current && <StatusBadge status={current.permission_level} />}
                      <StatusBadge status={a.status} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Permission ladder</h2>
        <div className="mt-3 space-y-2">
          {PERMISSION_LADDER.map((p) => (
            <Card key={p.level} className="text-sm">
              <p className="font-medium">{p.level}</p>
              <p className="text-soft-taupe">{p.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Human Approval Matrix</h2>

        {/* Section 16.4: "Tables must offer card or condensed-list
            alternatives on small screens" — a real alternative layout, not
            just horizontal scroll ("do not shrink a dense desktop dashboard
            into a miniature maze"). The table stays for larger screens; a
            stacked card list replaces it below the sm breakpoint. */}
        <div className="mt-3 hidden sm:block">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase text-soft-taupe">
                <th className="py-1 pr-4">Action</th>
                <th className="py-1 pr-4">AI may prepare</th>
                <th className="py-1">AI may execute without approval</th>
              </tr>
            </thead>
            <tbody>
              {APPROVAL_MATRIX.map((row) => (
                <tr key={row.action} className="border-t border-[var(--card-border)]">
                  <td className="py-1 pr-4">{row.action}</td>
                  <td className="py-1 pr-4 text-soft-taupe">{row.prepare}</td>
                  <td className="py-1 text-soft-taupe">{row.execute}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <ul className="mt-3 space-y-2 sm:hidden">
          {APPROVAL_MATRIX.map((row) => (
            <li key={row.action}>
              <Card className="text-sm">
                <p className="font-medium">{row.action}</p>
                <p className="mt-1 text-soft-taupe">
                  <span className="font-medium text-deep-indigo">Prepare: </span>
                  {row.prepare}
                </p>
                <p className="text-soft-taupe">
                  <span className="font-medium text-deep-indigo">Execute without approval: </span>
                  {row.execute}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">AI output contract</h2>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-soft-taupe">
          {OUTPUT_CONTRACT.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
