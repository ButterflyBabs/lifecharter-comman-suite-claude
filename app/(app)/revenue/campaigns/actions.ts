"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createCampaign(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("campaigns").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    campaign_type: formData.get("campaign_type") as string,
    objective: formData.get("objective") as string,
    audience: formData.get("audience") as string,
    offer_id: (formData.get("offer_id") as string) || null,
    business_unit_id: (formData.get("business_unit_id") as string) || null,
    cta: formData.get("cta") as string,
    start_at: (formData.get("start_at") as string) || null,
    end_at: (formData.get("end_at") as string) || null,
    budget: formData.get("budget") ? Number(formData.get("budget")) : null,
    tracking_code: formData.get("tracking_code") as string,
    scheduled_close_review_at: (formData.get("scheduled_close_review_at") as string) || null,
  });

  revalidatePath("/revenue/campaigns");
}

export async function approveCampaignLaunch(formData: FormData) {
  const campaignId = formData.get("campaign_id") as string;

  const supabase = await createClient();
  await supabase
    .from("campaigns")
    .update({ launch_approved_at: new Date().toISOString(), status: "active" })
    .eq("id", campaignId);

  revalidatePath("/revenue/campaigns");
}
