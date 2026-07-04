"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function createOrder(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  const total = Number(formData.get("total"));

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      workspace_id: workspaceId,
      opportunity_id: (formData.get("opportunity_id") as string) || null,
      total,
      payment_terms: formData.get("payment_terms") as string,
    })
    .select("id")
    .single();

  if (error || !order) {
    revalidatePath("/revenue/payments");
    return;
  }

  const opportunityId = (formData.get("opportunity_id") as string) || null;
  let businessUnitId: string | null = null;
  if (opportunityId) {
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("business_unit_id")
      .eq("id", opportunityId)
      .maybeSingle();
    businessUnitId = opportunity?.business_unit_id ?? null;
  }

  await supabase.from("invoices").insert({
    workspace_id: workspaceId,
    order_id: order.id,
    business_unit_id: businessUnitId,
    invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
    amount_due: total,
    due_at: (formData.get("due_at") as string) || null,
  });

  await supabase.from("orders").update({ status: "invoiced" }).eq("id", order.id);

  revalidatePath("/revenue/payments");
}

export async function recordPayment(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const invoiceId = formData.get("invoice_id") as string;
  const orderId = formData.get("order_id") as string;
  const amount = Number(formData.get("amount"));

  const supabase = await createClient();
  await supabase.from("payments").insert({
    workspace_id: workspaceId,
    invoice_id: invoiceId,
    provider: formData.get("provider") as string,
    provider_payment_id: (formData.get("provider_payment_id") as string) || `manual-${Date.now()}`,
    amount,
    status: "succeeded",
    paid_at: new Date().toISOString(),
  });

  await supabase.from("invoices").update({ status: "paid" }).eq("id", invoiceId);
  await supabase.from("orders").update({ status: "paid" }).eq("id", orderId);

  revalidatePath("/revenue/payments");
}

export async function requestRefund(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const paymentId = formData.get("payment_id") as string;
  const reason = formData.get("reason") as string;

  const supabase = await createClient();

  const { data: refund, error } = await supabase
    .from("refunds")
    .insert({
      workspace_id: workspaceId,
      payment_id: paymentId,
      amount: Number(formData.get("amount")),
      reason,
    })
    .select("id")
    .single();

  if (error || !refund) {
    revalidatePath("/revenue/payments");
    return;
  }

  // Refund issuance is a "prepare only, no AI execution without human
  // approval" action per Appendix C — routed through the same approvals
  // queue as every other approval-gated action, not a bespoke status field.
  const { data: approval } = await supabase
    .from("approvals")
    .insert({
      workspace_id: workspaceId,
      subject_type: "refunds",
      subject_id: refund.id,
      approval_type: "refund",
      status: "pending",
      comment: reason,
    })
    .select("id")
    .single();

  if (approval) {
    await supabase.from("refunds").update({ approval_id: approval.id }).eq("id", refund.id);
  }

  revalidatePath("/revenue/payments");
  revalidatePath("/approvals");
}
