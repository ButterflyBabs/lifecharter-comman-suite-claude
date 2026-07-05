// Business Command Audit — deeper per-phase assessment (server-side, BYOK, traced).
//
// Reads one phase's audit answers + score for a run and generates personalized
// milestone suggestions (generated content, not canonical question text). Fully
// traced in ai_runs + ai_run_sources; graceful no-op without a BYOK credential.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = [
  "You are a business operations coach doing a deep-dive on ONE phase of a completed",
  "Business Command Audit for a coaching/service business. Given the phase's answers and",
  "score, produce a short narrative and 3–5 concrete, personalized milestones to raise",
  "this phase's build completion and operating health. Respond with STRICT JSON only:",
  '{"narrative": string, "milestones": [{"title": string, "purpose": string,',
  '"definition_of_done": string, "effort": string, "rationale": string}]}.',
].join(" ");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
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
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 1800, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function ensureAgentVersion(admin: SupabaseClient, workspaceId: string, model: string, provider: string): Promise<string> {
  const name = "Business Command Audit";
  let { data: agent } = await admin.from("ai_agents").select("id").eq("workspace_id", workspaceId).eq("name", name).maybeSingle();
  if (!agent) {
    const { data: a } = await admin.from("ai_agents").insert({ workspace_id: workspaceId, name, purpose: "Interpret Business Command Audit results and draft follow-ups.", status: "active", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }).select("id").single();
    agent = a;
  }
  const { data: existing } = await admin.from("ai_agent_versions").select("id").eq("agent_id", agent!.id).eq("model", model).maybeSingle();
  if (existing) return existing.id;
  const { count } = await admin.from("ai_agent_versions").select("id", { count: "exact", head: true }).eq("agent_id", agent!.id);
  const { data: ver } = await admin.from("ai_agent_versions").insert({ workspace_id: workspaceId, agent_id: agent!.id, version: (count ?? 0) + 1, model, provider: provider ?? "anthropic", permission_level: "draft", effective_at: new Date().toISOString(), created_at: new Date().toISOString() }).select("id").single();
  await admin.from("ai_agents").update({ current_version_id: ver!.id }).eq("id", agent!.id);
  return ver!.id;
}

Deno.serve(async (req: Request) => {
  try {
    const { audit_instance_id, domain_id } = await req.json().catch(() => ({}));
    if (!audit_instance_id || !domain_id) return json({ error: "audit_instance_id and domain_id required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: inst } = await asUser.from("audit_instances").select("id, workspace_id").eq("id", audit_instance_id).maybeSingle();
    if (!inst) return json({ error: "not found or forbidden" }, 403);

    const admin = createClient(url, service);
    const { data: cred } = await admin.rpc("get_workspace_ai_key", { p_workspace_id: inst.workspace_id });
    if (!cred?.api_key) return json({ generated: false, reason: "no_credential" }, 200);
    const model = cred.model || DEFAULT_MODEL;

    const { data: domain } = await admin.from("business_command_domains").select("name").eq("id", domain_id).maybeSingle();
    const { data: responses } = await admin
      .from("audit_responses")
      .select("score, notes, response_json, audit_questions!inner(prompt, score_category, domain_id)")
      .eq("audit_instance_id", audit_instance_id)
      .eq("audit_questions.domain_id", domain_id);
    const { data: summary } = await admin
      .from("audit_findings_summary")
      .select("per_domain_scores")
      .eq("audit_instance_id", audit_instance_id)
      .maybeSingle();
    const phaseScore = ((summary?.per_domain_scores as any[]) ?? []).find((d) => d.domain_id === domain_id) ?? null;

    const agentVersionId = await ensureAgentVersion(admin, inst.workspace_id, model, cred.provider);
    const { data: run } = await admin
      .from("ai_runs")
      .insert({ workspace_id: inst.workspace_id, agent_version_id: agentVersionId, purpose: "audit_phase_assessment", action_type: "generate_milestones", status: "running", started_at: new Date().toISOString() })
      .select("id")
      .single();

    try {
      const userPrompt = JSON.stringify({
        phase: domain?.name,
        phase_score: phaseScore,
        answers: (responses ?? []).map((r: any) => ({ prompt: r.audit_questions?.prompt, category: r.audit_questions?.score_category, score: r.score, notes: r.notes })),
      });
      const aiText = await callAnthropic(cred.api_key, model, SYSTEM_PROMPT, userPrompt);
      const parsed = parseJson(aiText);

      await admin.from("audit_phase_assessments").upsert(
        {
          workspace_id: inst.workspace_id,
          audit_instance_id,
          domain_id,
          status: "generated",
          narrative: parsed.narrative ?? null,
          generated_milestones: Array.isArray(parsed.milestones) ? parsed.milestones : null,
          ai_run_id: run!.id,
        },
        { onConflict: "audit_instance_id,domain_id" },
      );

      await admin.from("ai_run_sources").insert({ workspace_id: inst.workspace_id, ai_run_id: run!.id, source_type: "audit_instance", source_id: audit_instance_id, authorization_basis: "workspace_member_owns_audit" });
      await admin.from("ai_runs").update({ status: "success", completed_at: new Date().toISOString() }).eq("id", run!.id);

      return json({ generated: true, milestones: Array.isArray(parsed.milestones) ? parsed.milestones.length : 0, ai_run_id: run!.id }, 200);
    } catch (e) {
      await admin.from("ai_runs").update({ status: "failed", error_message: String(e), completed_at: new Date().toISOString() }).eq("id", run!.id);
      return json({ generated: false, error: String(e) }, 200);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
