"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addPerson(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("people").insert({
    workspace_id: workspaceId,
    preferred_name: formData.get("preferred_name") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    primary_pathway: (formData.get("primary_pathway") as string) || null,
    next_action: formData.get("next_action") as string,
  });

  revalidatePath("/revenue/relationships");
}

export async function addOrganization(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("organizations").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
    domain: formData.get("domain") as string,
    industry: formData.get("industry") as string,
    size_band: formData.get("size_band") as string,
    website: formData.get("website") as string,
    next_action: formData.get("next_action") as string,
  });

  revalidatePath("/revenue/relationships");
}
