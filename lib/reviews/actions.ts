"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FINDING_SEVERITIES, type ReviewOutputRules, type ReviewQuestion } from "./types";

function splitLines(raw: FormDataEntryValue | null, max?: number): string[] {
  const text = (raw as string) ?? "";
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return max ? items.slice(0, max) : items;
}

// Generic across all six cadences — driven entirely by the review_template's
// questions_json/output_rules_json (Section 9.9: "every review template must
// define... required questions, required outputs... resulting tasks,
// decisions, and roadmap updates"), rather than bespoke per-cadence code.
export async function submitReview(
  reviewInstanceId: string,
  workspaceId: string,
  cadence: string,
  questions: ReviewQuestion[],
  outputRules: ReviewOutputRules,
  redirectPath: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: activePhase } = await supabase
    .from("roadmap_phases")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  for (const q of questions) {
    if (q.type === "text") {
      const value = (formData.get(q.key) as string) ?? "";
      await supabase
        .from("review_responses")
        .upsert(
          { workspace_id: workspaceId, review_instance_id: reviewInstanceId, question_key: q.key, response_json: { text: value } },
          { onConflict: "review_instance_id,question_key" },
        );
      continue;
    }

    if (q.type === "outcome_list") {
      const items = splitLines(formData.get(q.key), q.max);
      await supabase
        .from("review_responses")
        .upsert(
          { workspace_id: workspaceId, review_instance_id: reviewInstanceId, question_key: q.key, response_json: { items } },
          { onConflict: "review_instance_id,question_key" },
        );
      for (const item of items) {
        await supabase.from("outcomes").insert({
          workspace_id: workspaceId,
          cadence,
          title: item,
          owner: user?.id,
          status: "open",
          review_instance_id: reviewInstanceId,
        });
        // Quarterly priorities double as roadmap updates: added directly to
        // the roadmap's currently active phase (Section 9.6 ties the
        // quarterly review to the twelve-domain roadmap reassessment).
        if (cadence === "quarterly" && q.key === "quarterly_priorities" && activePhase) {
          await supabase.from("roadmap_milestones").insert({
            workspace_id: workspaceId,
            phase_id: activePhase.id,
            title: item,
            owner: user?.id,
            status: "not_started",
            definition_of_done: "Addressed as part of this quarter's priorities.",
          });
        }
      }
      continue;
    }

    if (q.type === "decision_list") {
      const items = splitLines(formData.get(q.key), q.max);
      await supabase
        .from("review_responses")
        .upsert(
          { workspace_id: workspaceId, review_instance_id: reviewInstanceId, question_key: q.key, response_json: { items } },
          { onConflict: "review_instance_id,question_key" },
        );
      for (const item of items) {
        await supabase.from("decisions").insert({
          workspace_id: workspaceId,
          question: item,
          owner: user?.id,
          status: "open",
        });
      }
      continue;
    }

    if (q.type === "blocker_list") {
      const items = splitLines(formData.get(q.key), q.max);
      await supabase
        .from("review_responses")
        .upsert(
          { workspace_id: workspaceId, review_instance_id: reviewInstanceId, question_key: q.key, response_json: { items } },
          { onConflict: "review_instance_id,question_key" },
        );
      for (const item of items) {
        await supabase.from("blockers").insert({
          workspace_id: workspaceId,
          subject_type: "review_instance",
          subject_id: reviewInstanceId,
          reason: item,
          status: "active",
        });
      }
      continue;
    }

    if (q.type === "finding_list") {
      const bySeverity: Record<string, string[]> = {};
      for (const severity of FINDING_SEVERITIES) {
        bySeverity[severity] = splitLines(formData.get(`${q.key}__${severity}`));
      }
      await supabase
        .from("review_responses")
        .upsert(
          { workspace_id: workspaceId, review_instance_id: reviewInstanceId, question_key: q.key, response_json: bySeverity },
          { onConflict: "review_instance_id,question_key" },
        );
      for (const severity of FINDING_SEVERITIES) {
        for (const statement of bySeverity[severity]) {
          await supabase.from("review_findings").insert({
            workspace_id: workspaceId,
            review_instance_id: reviewInstanceId,
            category: q.key,
            severity,
            statement,
            approved_by: user?.id,
          });
        }
      }
    }
  }

  await supabase
    .from("review_instances")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", reviewInstanceId);

  if (outputRules.launches_audit) {
    const { data: auditTemplate } = await supabase
      .from("audit_templates")
      .select("id")
      .eq("name", "Business Command Audit — Standard")
      .single();
    if (auditTemplate) {
      await supabase.from("audit_instances").insert({ workspace_id: workspaceId, template_id: auditTemplate.id });
    }
  }

  redirect(redirectPath);
}
