"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

const RECOMMENDED_AGENTS = [
  { name: "Chief of Staff", purpose: "Daily briefs, weekly reviews, decision queues, blockers, delegation, and next actions." },
  { name: "Business Architect", purpose: "Audit, roadmap, strategy, stage gates, dependencies, and definitions of done." },
  { name: "Market Researcher", purpose: "Market, competitor, audience, public-source research, evidence, and confidence." },
  { name: "Offer Strategist", purpose: "Offer architecture, scope, pricing scenarios, capacity, and economics." },
  { name: "Brand Voice Guardian", purpose: "Voice consistency, messaging, claims, vocabulary, proof, and audience variants." },
  { name: "Content Director", purpose: "Campaign briefs, calendars, drafts, repurposing, and performance learning." },
  { name: "Revenue Assistant", purpose: "Research, outreach, call preparation, follow-up, proposals, pipeline, and forecast." },
  { name: "Client Success Assistant", purpose: "Session preparation, progress summaries, risk, renewals, referrals, and testimonials." },
  { name: "Operations Architect", purpose: "SOPs, automations, delegation, bottlenecks, systems, and QA." },
  { name: "Finance and Risk Analyst", purpose: "Financial summaries, variance, offer margin, anomalies, risk questions, and review preparation." },
];

async function createAgentWithFirstVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  name: string,
  purpose: string,
) {
  const { data: agent } = await supabase
    .from("ai_agents")
    .insert({ workspace_id: workspaceId, name, purpose })
    .select("id")
    .single();

  if (!agent) return;

  const { data: version } = await supabase
    .from("ai_agent_versions")
    .insert({ workspace_id: workspaceId, agent_id: agent.id, version: 1 })
    .select("id")
    .single();

  if (version) {
    await supabase.from("ai_agents").update({ current_version_id: version.id }).eq("id", agent.id);
  }
}

export async function seedRecommendedAgents() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const { data: existing } = await supabase.from("ai_agents").select("name").eq("workspace_id", workspaceId);
  const existingNames = new Set((existing ?? []).map((a) => a.name));

  for (const agent of RECOMMENDED_AGENTS) {
    if (!existingNames.has(agent.name)) {
      await createAgentWithFirstVersion(supabase, workspaceId, agent.name, agent.purpose);
    }
  }

  revalidatePath("/ai/agents");
}

export async function createAgent(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await createAgentWithFirstVersion(supabase, workspaceId, formData.get("name") as string, (formData.get("purpose") as string) || "");

  revalidatePath("/ai/agents");
}

export async function addAgentVersion(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const agentId = formData.get("agent_id") as string;
  const supabase = await createClient();

  const { count } = await supabase.from("ai_agent_versions").select("id", { count: "exact", head: true }).eq("agent_id", agentId);

  const { data: version } = await supabase
    .from("ai_agent_versions")
    .insert({
      workspace_id: workspaceId,
      agent_id: agentId,
      version: (count ?? 0) + 1,
      model: (formData.get("model") as string) || null,
      provider: (formData.get("provider") as string) || null,
      system_prompt: (formData.get("system_prompt") as string) || null,
      capabilities: (formData.get("capabilities") as string) || null,
      allowed_data: (formData.get("allowed_data") as string) || null,
      prohibited_actions: (formData.get("prohibited_actions") as string) || null,
      permission_level: (formData.get("permission_level") as string) || "read_and_analyze",
      retention_policy: (formData.get("retention_policy") as string) || null,
      effective_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("ai_agents").update({ current_version_id: version.id }).eq("id", agentId);
  }

  revalidatePath("/ai/agents");
}

export async function updateAgentStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("ai_agents").update({ status: formData.get("next_status") as string }).eq("id", formData.get("agent_id") as string);

  revalidatePath("/ai/agents");
}
