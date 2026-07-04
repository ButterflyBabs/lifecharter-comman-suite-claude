"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getStripeClient } from "@/lib/stripe/client";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

async function getOrigin() {
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function startCheckout(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/billing?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20manage%20billing");
  }

  const priceId = formData.get("stripe_price_id") as string;
  if (!priceId) {
    redirect("/settings/billing?error=This%20plan%20has%20no%20price%20configured%20yet");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const origin = await getOrigin();
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user?.email ?? undefined,
    client_reference_id: workspaceId,
    subscription_data: {
      metadata: { workspace_id: workspaceId },
    },
    metadata: { workspace_id: workspaceId },
    success_url: `${origin}/settings/billing?checkout=success`,
    cancel_url: `${origin}/settings/billing?checkout=canceled`,
  });

  if (session.url) redirect(session.url);
}

export async function openBillingPortal() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/billing?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20manage%20billing");
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("workspace_subscriptions")
    .select("stripe_customer_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    redirect("/settings/billing?error=No%20billing%20account%20on%20file%20yet");
  }

  const origin = await getOrigin();
  const stripe = getStripeClient();

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription!.stripe_customer_id!,
    return_url: `${origin}/settings/billing`,
  });

  redirect(portalSession.url);
}
