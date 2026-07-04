"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createOffer(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();

  const { data: offer, error } = await supabase
    .from("offers")
    .insert({
      workspace_id: workspaceId,
      name: formData.get("name") as string,
      offer_type: formData.get("offer_type") as string,
      audience: formData.get("audience") as string,
    })
    .select("id")
    .single();

  if (error || !offer) {
    revalidatePath("/architecture/offers");
    return;
  }

  const { data: version } = await supabase
    .from("offer_versions")
    .insert({
      workspace_id: workspaceId,
      offer_id: offer.id,
      version: 1,
      problem: formData.get("problem") as string,
      desired_outcome: formData.get("desired_outcome") as string,
      format: formData.get("format") as string,
      duration: formData.get("duration") as string,
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("offers").update({ current_version_id: version.id }).eq("id", offer.id);
  }

  revalidatePath("/architecture/offers");
}

export async function addOfferDeliverable(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("offer_deliverables").insert({
    workspace_id: workspaceId,
    offer_version_id: formData.get("offer_version_id") as string,
    title: formData.get("title") as string,
    description: formData.get("description") as string,
    owner_role: formData.get("owner_role") as string,
    client_visible: formData.get("client_visible") === "on",
    sequence: Number(formData.get("sequence")) || 0,
  });

  revalidatePath("/architecture/offers");
}

export async function setOfferStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("offers").update({ status }).eq("id", id);
  revalidatePath("/architecture/offers");
}
