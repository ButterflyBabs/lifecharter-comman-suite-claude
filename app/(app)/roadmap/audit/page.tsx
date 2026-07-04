import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { submitAudit } from "./actions";

export default async function AuditPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Business Command Audit</h1>
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

  const { data: template } = await supabase
    .from("audit_templates")
    .select("id")
    .eq("name", "Business Command Audit — Standard")
    .single();

  let { data: instance } = await supabase
    .from("audit_instances")
    .select("id, status")
    .eq("workspace_id", workspaceId)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: completedInstance } = await supabase
    .from("audit_instances")
    .select("id, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!instance && template) {
    const { data: created } = await supabase
      .from("audit_instances")
      .insert({ workspace_id: workspaceId, template_id: template.id })
      .select("id, status")
      .single();
    instance = created;
  }

  if (!instance) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">Business Command Audit</h1>
        <p className="mt-2 text-sm text-soft-taupe">No audit template is available yet.</p>
      </div>
    );
  }

  const { data: questions } = await supabase
    .from("audit_questions")
    .select("id, prompt, score_category, domain_id, business_command_domains(id, name, display_order)")
    .eq("audit_template_id", template!.id)
    .order("domain_id");

  const { data: responses } = await supabase
    .from("audit_responses")
    .select("question_id, score, notes")
    .eq("audit_instance_id", instance.id);

  const responseByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r]));

  type QuestionRow = {
    id: string;
    prompt: string;
    score_category: string;
    domain_id: string;
    business_command_domains: { id: string; name: string; display_order: number } | null;
  };

  const byDomain = new Map<string, { name: string; order: number; questions: QuestionRow[] }>();
  for (const q of (questions ?? []) as unknown as QuestionRow[]) {
    const domain = q.business_command_domains;
    if (!domain) continue;
    if (!byDomain.has(domain.id)) {
      byDomain.set(domain.id, { name: domain.name, order: domain.display_order, questions: [] });
    }
    byDomain.get(domain.id)!.questions.push(q);
  }
  const domains = [...byDomain.values()].sort((a, b) => a.order - b.order);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">Business Command Audit</h1>
      <p className="mt-2 max-w-2xl text-sm text-soft-taupe">
        Score each of the Twelve Business Command Domains on two independent measures
        (Section 9.6): <strong>Build Completion</strong> — does the foundation exist —
        and <strong>Operating Health</strong> — is it currently producing the intended
        result. Submitting generates a prioritized roadmap from the lowest-scoring
        domains.
      </p>
      {completedInstance && (
        <p className="mt-2 text-sm text-soft-taupe">
          You have a prior completed audit. Submitting this one starts a fresh cycle and
          adds a new roadmap.
        </p>
      )}

      <form action={submitAudit} className="mt-6 space-y-8">
        <input type="hidden" name="instance_id" value={instance.id} />
        {domains.map((domain) => (
          <fieldset key={domain.name} className="rounded border border-soft-taupe/40 p-4">
            <legend className="px-2 text-lg font-semibold text-deep-indigo">{domain.name}</legend>
            {domain.questions.map((q) => {
              const existing = responseByQuestion.get(q.id);
              return (
                <div key={q.id} className="mt-3">
                  <label htmlFor={`score_${q.id}`} className="block text-sm font-medium text-deep-indigo">
                    {q.prompt}{" "}
                    <span className="text-xs text-soft-taupe">
                      ({q.score_category === "build_completion" ? "Build Completion" : "Operating Health"})
                    </span>
                  </label>
                  <input
                    id={`score_${q.id}`}
                    name={`score_${q.id}`}
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={existing?.score ?? 50}
                    className="mt-1 w-full max-w-md"
                  />
                </div>
              );
            })}
          </fieldset>
        ))}

        <button
          type="submit"
          className="lc-btn-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          Submit audit and generate roadmap
        </button>
      </form>
    </div>
  );
}
