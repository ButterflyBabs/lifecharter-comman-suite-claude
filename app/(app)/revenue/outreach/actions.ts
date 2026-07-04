"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addLead(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("leads").insert({
    workspace_id: workspaceId,
    person_id: (formData.get("person_id") as string) || null,
    organization_id: (formData.get("organization_id") as string) || null,
    business_unit_id: (formData.get("business_unit_id") as string) || null,
    pathway: (formData.get("pathway") as string) || null,
    qualification_rationale: formData.get("qualification_rationale") as string,
    outreach_angle: formData.get("outreach_angle") as string,
    next_action: formData.get("next_action") as string,
  });

  revalidatePath("/revenue/outreach");
}

export async function updateLeadStatus(formData: FormData) {
  const leadId = formData.get("lead_id") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  await supabase.from("leads").update({ status }).eq("id", leadId);

  revalidatePath("/revenue/outreach");
}

export async function draftOutreachMessage(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("outreach_messages").insert({
    workspace_id: workspaceId,
    lead_id: formData.get("lead_id") as string,
    subject: formData.get("subject") as string,
    body: formData.get("body") as string,
  });

  revalidatePath("/revenue/outreach");
}

export async function approveAndSendMessage(formData: FormData) {
  const messageId = formData.get("message_id") as string;

  const supabase = await createClient();
  await supabase
    .from("outreach_messages")
    .update({ approval_status: "approved", sent_at: new Date().toISOString() })
    .eq("id", messageId);

  revalidatePath("/revenue/outreach");
}
