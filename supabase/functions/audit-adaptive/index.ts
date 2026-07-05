// Business Command Audit — adaptive follow-up questions (server-side, BYOK, traced).
//
// After a domain is fully answered, decide whether follow-ups are warranted and
// store any in the tenant-scoped audit_adaptive_questions table (never the shared
// bank) before the client advances. BYOK key comes from Vault via a service-role
// RPC; every call is traced in ai_runs + ai_run_sources. Graceful no-op when no
// workspace credential is configured.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-5";

const SYSTEM_PROMPT = [
  "You are reviewing one domain of a Business Command Audit for a coaching/service business.",
  "Given the domain's answers, decide whether 0–3 targeted follow-up questions would",
  "materially sharpen the assessment (e.g., a low score with no notes, or a contradiction).",
  "Return STRICT JSON only: {\"questions\": [{\"prompt\": string, \"rationale\": string,",
  "\"score_category\": \"build_completion\" | \"operating_health\"}]}. Return an empty array if",
  "no follow-up is warranted. Never repeat a question already asked.",
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
    body: JSON.stringify({ model, max_tokens: 1200, system, messages: [{ role: "user", content: user }] }),
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
      permission_level: "draft",
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
    const { audit_instance_id, domain_id } = await req.json().catch(() => ({}));
    if (!audit_instance_id || !domain_id) return json({ error: "audit_instance_id and domain_id required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const asUser = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: inst } = await asUser
      .from("audit_instances")
      .select("id, workspace_id")
      .eq("id", audit_instance_id)
      .maybeSingle();
    if (!inst) return json({ error: "not found or forbidden" }, 403);

    const admin = createClient(url, service);

    const { data: cred } = await admin.rpc("get_workspace_ai_key", { p_workspace_id: inst.workspace_id });
    if (!cred?.api_key) return json({ generated: 0, reason: "no_credential" }, 200);
    const model = cred.model || DEFAULT_MODEL;

    // Domain answers + any adaptive questions already asked (avoid repeats).
    const { data: responses } = await admin
      .from("audit_responses")
      .select("score, notes, audit_questions!inner(prompt, score_category, domain_id)")
      .eq("audit_instance_id", audit_instance_id)
      .eq("audit_questions.domain_id", domain_id);

    const { data: priorAdaptive } = await admin
      .from("audit_adaptive_questions")
      .select("prompt")
      .eq("audit_instance_id", audit_instance_id)
      .eq("domain_id", domain_id);

    const agentVersionId = await ensureAgentVersion(admin, inst.workspace_id, model, cred.provider);

    const { data: run } = await admin
      .from("ai_runs")
      .insert({
        workspace_id: inst.workspace_id,
        agent_version_id: agentVersionId,
        purpose: "audit_adaptive_followups",
        action_type: "draft_questions",
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    try {
      const userPrompt = JSON.stringify({
        answers: (responses ?? []).map((r: any) => ({
          prompt: r.audit_questions?.prompt,
          category: r.audit_questions?.score_category,
          score: r.score,
          notes: r.notes,
        })),
        already_asked: (priorAdaptive ?? []).map((p) => p.prompt),
      });

      const aiText = await callAnthropic(cred.api_key, model, SYSTEM_PROMPT, userPrompt);
      const parsed = parseJson(aiText);
      const questions: any[] = Array.isArray(parsed?.questions) ? parsed.questions : [];

      const rows = questions
        .filter((q) => q?.prompt)
        .slice(0, 3)
        .map((q, i) => ({
          workspace_id: inst.workspace_id,
          audit_instance_id,
          domain_id,
          prompt: String(q.prompt),
          response_type: "text",
          score_category: ["build_completion", "operating_health"].includes(q.score_category)
            ? q.score_category
            : null,
          rationale: q.rationale ? String(q.rationale) : null,
          ai_run_id: run!.id,
          status: "pending",
          display_order: i,
        }));

      if (rows.length > 0) {
        await admin.from("audit_adaptive_questions").insert(rows);
      }

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

      return json({ generated: rows.length, ai_run_id: run!.id }, 200);
    } catch (e) {
      await admin
        .from("ai_runs")
        .update({ status: "failed", error_message: String(e), completed_at: new Date().toISOString() })
        .eq("id", run!.id);
      return json({ generated: 0, error: String(e) }, 200);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
