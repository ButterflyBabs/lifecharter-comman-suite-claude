// Business Command Audit — findings generation (server-side, BYOK, traced).
//
// Deterministic scoring already ran at completion (lib/audit/flow.ts); this
// function adds ONLY the AI narrative interpretation on top of those numbers.
// The BYOK key is pulled from Vault via a service-role-only RPC and never leaves
// the server. Every call is fully traced in ai_runs + ai_run_sources. If no
// workspace credential is configured, it no-ops gracefully (deterministic
// findings still stand).
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = [
  "You are a business operations analyst interpreting a completed Business Command Audit",
  "for a coaching or service business. You are given deterministic scores (already",
  "computed from the client's answers) and the raw responses. Interpret and explain —",
  "never change or invent the numbers. Respond with STRICT JSON only, no prose, matching:",
  '{"narrative": string, "top_gaps": [{"domain_name": string, "impact": string, "risk": string,',
  '"rationale": string, "recommended_action": string, "effort": string}], "strengths": [string],',
  '"contradictions": [string], "missing_evidence": [string], "dependency_analysis": [string],',
  '"recommended_phase_order": [string], "ninety_day_priorities": [string]}',
].join(" ");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function parseJson(text: string): any {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  return JSON.parse(t);
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function ensureAgentVersion(
  admin: SupabaseClient,
  workspaceId: string,
  model: string,
  provider: string,
): Promise<string> {
  const name = "Business Command Audit";
  let { data: agent } = await admin
    .from("ai_agents")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", name)
    .maybeSingle();

  if (!agent) {
    const { data: a } = await admin
      .from("ai_agents")
      .insert({
        workspace_id: workspaceId,
        name,
        purpose: "Interpret Business Command Audit results and draft follow-ups.",
        status: "active",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    agent = a;
  }

  const { data: existing } = await admin
    .from("ai_agent_versions")
    .select("id")
    .eq("agent_id", agent!.id)
    .eq("model", model)
    .maybeSingle();
  if (existing) return existing.id;

  const { count } = await admin
    .from("ai_agent_versions")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent!.id);

  const { data: ver } = await admin
    .from("ai_agent_versions")
    .insert({
      workspace_id: workspaceId,
      agent_id: agent!.id,
      version: (count ?? 0) + 1,
      model,
      provider: provider ?? "anthropic",
      permission_level: "read_and_analyze",
      effective_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  await admin.from("ai_agents").update({ current_version_id: ver!.id }).eq("id", agent!.id);
  return ver!.id;
}

Deno.serve(async (req: Request) => {
  try {
    const { audit_instance_id } = await req.json().catch(() => ({}));
    if (!audit_instance_id) return json({ error: "audit_instance_id required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    // Membership check via caller JWT + RLS.
    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: inst } = await asUser
      .from("audit_instances")
      .select("id, workspace_id")
      .eq("id", audit_instance_id)
      .maybeSingle();
    if (!inst) return json({ error: "not found or forbidden" }, 403);

    const admin = createClient(url, service);

    const { data: cred } = await admin.rpc("get_workspace_ai_key", { p_workspace_id: inst.workspace_id });
    if (!cred?.api_key) return json({ enriched: false, reason: "no_credential" }, 200);
    const model = cred.model || DEFAULT_MODEL;

    const { data: summary } = await admin
      .from("audit_findings_summary")
      .select("overall_score, per_domain_scores")
      .eq("audit_instance_id", audit_instance_id)
      .maybeSingle();

    const { data: responses } = await admin
      .from("audit_responses")
      .select("score, notes, response_json, audit_questions(prompt, score_category, business_command_domains(name))")
      .eq("audit_instance_id", audit_instance_id);

    const compactResponses = (responses ?? []).map((r: any) => ({
      domain: r.audit_questions?.business_command_domains?.name,
      category: r.audit_questions?.score_category,
      prompt: r.audit_questions?.prompt,
      score: r.score,
      notes: r.notes,
    }));

    const agentVersionId = await ensureAgentVersion(admin, inst.workspace_id, model, cred.provider);

    const { data: run } = await admin
      .from("ai_runs")
      .insert({
        workspace_id: inst.workspace_id,
        agent_version_id: agentVersionId,
        purpose: "audit_findings",
        action_type: "generate_findings",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    try {
      const userPrompt = JSON.stringify({
        overall_score: summary?.overall_score ?? null,
        per_domain_scores: summary?.per_domain_scores ?? [],
        responses: compactResponses,
      });
      const aiText = await callAnthropic(cred.api_key, model, SYSTEM_PROMPT, userPrompt);
      const parsed = parseJson(aiText);

      await admin
        .from("audit_findings_summary")
        .update({
          narrative: parsed.narrative ?? null,
          top_gaps: parsed.top_gaps ?? null,
          strengths: parsed.strengths ?? null,
          contradictions: parsed.contradictions ?? null,
          missing_evidence: parsed.missing_evidence ?? null,
          dependency_analysis: parsed.dependency_analysis ?? null,
          recommended_phase_order: parsed.recommended_phase_order ?? null,
          ninety_day_priorities: parsed.ninety_day_priorities ?? null,
          ai_run_id: run!.id,
        })
        .eq("audit_instance_id", audit_instance_id);

      await admin.from("ai_run_sources").insert({
        workspace_id: inst.workspace_id,
        ai_run_id: run!.id,
        source_type: "audit_instance",
        source_id: audit_instance_id,
        authorization_basis: "workspace_member_owns_audit",
      });

      await admin
        .from("ai_runs")
        .update({ status: "success", completed_at: new Date().toISOString() })
        .eq("id", run!.id);

      return json({ enriched: true, ai_run_id: run!.id }, 200);
    } catch (e) {
      await admin
        .from("ai_runs")
        .update({ status: "failed", error_message: String(e), completed_at: new Date().toISOString() })
        .eq("id", run!.id);
      return json({ enriched: false, error: String(e) }, 200);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
