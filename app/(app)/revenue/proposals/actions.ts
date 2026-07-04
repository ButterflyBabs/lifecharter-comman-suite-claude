"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createProposal(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      workspace_id: workspaceId,
      opportunity_id: formData.get("opportunity_id") as string,
      expires_at: (formData.get("expires_at") as string) || null,
    })
    .select("id")
    .single();

  if (error || !proposal) {
    revalidatePath("/revenue/proposals");
    return;
  }

  const { data: version } = await supabase
    .from("proposal_versions")
    .insert({
      workspace_id: workspaceId,
      proposal_id: proposal.id,
      version: 1,
      terms_summary: formData.get("terms_summary") as string,
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("proposals").update({ current_version_id: version.id }).eq("id", proposal.id);
  }

  revalidatePath("/revenue/proposals");
}

export async function sendProposal(formData: FormData) {
  const proposalId = formData.get("proposal_id") as string;

  const supabase = await createClient();
  await supabase
    .from("proposals")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", proposalId);

  revalidatePath("/revenue/proposals");
}

export async function setProposalStatus(formData: FormData) {
  const proposalId = formData.get("proposal_id") as string;
  const status = formData.get("status") as string;

  const supabase = await createClient();
  await supabase.from("proposals").update({ status }).eq("id", proposalId);

  revalidatePath("/revenue/proposals");
}
