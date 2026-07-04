"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createContract(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      workspace_id: workspaceId,
      opportunity_id: (formData.get("opportunity_id") as string) || null,
      signatory: formData.get("signatory") as string,
    })
    .select("id")
    .single();

  if (error || !contract) {
    revalidatePath("/revenue/contracts");
    return;
  }

  const { data: version } = await supabase
    .from("contract_versions")
    .insert({
      workspace_id: workspaceId,
      contract_id: contract.id,
      version: 1,
      payment_terms: formData.get("payment_terms") as string,
      obligations: formData.get("obligations") as string,
    })
    .select("id")
    .single();

  if (version) {
    await supabase.from("contracts").update({ current_version_id: version.id }).eq("id", contract.id);
  }

  revalidatePath("/revenue/contracts");
}

export async function markContractSigned(formData: FormData) {
  const contractId = formData.get("contract_id") as string;
  const versionId = formData.get("version_id") as string;

  const supabase = await createClient();
  await Promise.all([
    supabase
      .from("contracts")
      .update({ status: "signed", effective_at: new Date().toISOString() })
      .eq("id", contractId),
    supabase
      .from("contract_versions")
      .update({ signature_status: "signed", signed_at: new Date().toISOString() })
      .eq("id", versionId),
  ]);

  revalidatePath("/revenue/contracts");
}
