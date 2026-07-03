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
