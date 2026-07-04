import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { submitReview } from "@/lib/reviews/actions";
import { FINDING_SEVERITIES, type ReviewOutputRules, type ReviewQuestion } from "@/lib/reviews/types";

const CADENCE_LABELS: Record<string, string> = {
  daily: "Daily Opening and Close",
  weekly: "Weekly CEO Review",
  monthly: "Monthly Business Review",
  quarterly: "Quarterly Business Command Audit",
  semiannual: "Semiannual Recalibration",
  annual: "Annual Architecture and Planning",
};

export async function ReviewCadencePage({ cadence, redirectPath }: { cadence: string; redirectPath: string }) {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">{CADENCE_LABELS[cadence]}</h1>
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
    .from("review_templates")
    .select("id, cadence, questions_json, output_rules_json")
    .eq("cadence", cadence)
    .single();

  if (!template) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">{CADENCE_LABELS[cadence]}</h1>
        <p className="mt-2 text-sm text-soft-taupe">No review template found for this cadence.</p>
      </div>
    );
  }

  let { data: instance } = await supabase
    .from("review_instances")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("template_id", template.id)
    .eq("status", "in_progress")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!instance) {
    const { data: created } = await supabase
      .from("review_instances")
      .insert({ workspace_id: workspaceId, template_id: template.id })
      .select("id")
      .single();
    instance = created;
  }

  if (!instance) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold text-deep-indigo">{CADENCE_LABELS[cadence]}</h1>
        <p className="mt-2 text-sm text-soft-taupe">Could not start a review instance.</p>
      </div>
    );
  }

  const { data: completed } = await supabase
    .from("review_instances")
    .select("id, completed_at")
    .eq("workspace_id", workspaceId)
    .eq("template_id", template.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const questions = template.questions_json as ReviewQuestion[];
  const outputRules = template.output_rules_json as ReviewOutputRules;
  const boundSubmit = submitReview.bind(null, instance.id, workspaceId, cadence, questions, outputRules, redirectPath);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-deep-indigo">{CADENCE_LABELS[cadence]}</h1>
      {completed?.completed_at && (
        <p className="mt-1 text-xs text-soft-taupe">
          Last completed {new Date(completed.completed_at).toLocaleString()}
        </p>
      )}
      <form action={boundSubmit} className="mt-6 max-w-2xl space-y-6">
        {questions.map((q) => (
          <div key={q.key}>
            <label htmlFor={q.key} className="block text-sm font-medium text-deep-indigo">
              {q.label}
            </label>
            {q.type === "text" ? (
              <textarea
                id={q.key}
                name={q.key}
                rows={3}
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
              />
            ) : q.type === "finding_list" ? (
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {FINDING_SEVERITIES.map((severity) => (
                  <div key={severity}>
                    <label htmlFor={`${q.key}__${severity}`} className="block text-xs text-soft-taupe">
                      {severity.replace("_", " ")}
                    </label>
                    <textarea
                      id={`${q.key}__${severity}`}
                      name={`${q.key}__${severity}`}
                      rows={2}
                      placeholder="One per line"
                      className="mt-1 w-full rounded border border-soft-taupe px-2 py-1 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <textarea
                id={q.key}
                name={q.key}
                rows={3}
                placeholder={q.max ? `One per line, up to ${q.max}` : "One per line"}
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-sacred-teal"
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="rounded bg-deep-indigo px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sacred-teal"
        >
          Complete review
        </button>
      </form>
    </div>
  );
}
