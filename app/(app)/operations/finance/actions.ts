"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createBudget(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("budgets").insert({
    workspace_id: workspaceId,
    period: formData.get("period") as string,
    scenario: (formData.get("scenario") as string) || "base_case",
  });

  revalidatePath("/operations/finance");
}

export async function addBudgetLine(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("budget_lines").insert({
    workspace_id: workspaceId,
    budget_id: formData.get("budget_id") as string,
    category: formData.get("category") as string,
    offer_id: (formData.get("offer_id") as string) || null,
    planned_amount: formData.get("planned_amount") ? Number(formData.get("planned_amount")) : null,
    actual_amount: formData.get("actual_amount") ? Number(formData.get("actual_amount")) : null,
  });

  revalidatePath("/operations/finance");
}

export async function createExpenseCategory(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("expense_categories").insert({
    workspace_id: workspaceId,
    name: formData.get("name") as string,
  });

  revalidatePath("/operations/finance");
}

export async function addExpense(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("expenses").insert({
    workspace_id: workspaceId,
    category_id: (formData.get("category_id") as string) || null,
    vendor_id: (formData.get("vendor_id") as string) || null,
    amount: Number(formData.get("amount")),
    occurred_at: (formData.get("occurred_at") as string) || new Date().toISOString().slice(0, 10),
    source: (formData.get("source") as string) || null,
  });

  revalidatePath("/operations/finance");
}
