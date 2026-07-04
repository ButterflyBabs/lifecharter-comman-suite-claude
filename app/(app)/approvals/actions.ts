"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function decideApproval(approvalId: string, decision: "approved" | "rejected") {
  const supabase = await createClient();
  const { error } = await supabase
    .from("approvals")
    .update({ status: decision, decision_at: new Date().toISOString() })
    .eq("id", approvalId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/approvals");
}

// Section 16.2: "Batch approval and batch editing where safe" — decides
// every checked approval in one action rather than one row at a time.
export async function decideApprovalsBatch(decision: "approved" | "rejected", formData: FormData) {
  const approvalIds = formData.getAll("approval_ids") as string[];
  if (approvalIds.length === 0) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("approvals")
    .update({ status: decision, decision_at: new Date().toISOString() })
    .in("id", approvalIds);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/approvals");
}
