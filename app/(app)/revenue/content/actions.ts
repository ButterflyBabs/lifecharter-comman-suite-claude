"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

const WORKFLOW = ["idea", "brief", "drafting", "needs_review", "approved", "scheduled", "live", "repurpose", "archived"];

export async function createContentAsset(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("content_assets").insert({
    workspace_id: workspaceId,
    title: formData.get("title") as string,
    format: formData.get("format") as string,
    topic_and_pillar: formData.get("topic_and_pillar") as string,
    audience: formData.get("audience") as string,
    funnel_stage: formData.get("funnel_stage") as string,
    campaign_id: (formData.get("campaign_id") as string) || null,
    offer_id: (formData.get("offer_id") as string) || null,
    cta: formData.get("cta") as string,
  });

  revalidatePath("/revenue/content");
}

export async function advanceContentStatus(formData: FormData) {
  const contentId = formData.get("content_id") as string;
  const currentStatus = formData.get("current_status") as string;

  const currentIndex = WORKFLOW.indexOf(currentStatus);
  const nextStatus = WORKFLOW[Math.min(currentIndex + 1, WORKFLOW.length - 1)];

  const supabase = await createClient();
  const updates: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "live") updates.publish_at = new Date().toISOString();

  await supabase.from("content_assets").update(updates).eq("id", contentId);

  revalidatePath("/revenue/content");
}

export async function setContentChecks(formData: FormData) {
  const contentId = formData.get("content_id") as string;

  const supabase = await createClient();
  await supabase
    .from("content_assets")
    .update({
      claim_check_status: formData.get("claim_check_status") as string,
      accessibility_check_status: formData.get("accessibility_check_status") as string,
    })
    .eq("id", contentId);

  revalidatePath("/revenue/content");
}
