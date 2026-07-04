import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

// Stripe webhooks arrive as one event stream for the whole connected
// account, covering every workspace's subscription — there's no
// per-workspace auth context to key off, so this route always uses the
// service-role admin client (Section 11.6: "service-role operations are
// server-only and fully audited" — every event is recorded in
// billing_webhook_events regardless of outcome). Idempotency comes from
// billing_webhook_events.stripe_event_id's unique constraint: a duplicate
// delivery fails the insert and the handler returns 200 without
// reprocessing, the same idempotency guard pattern as Phase 6's
// webhook_events table.

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: insertError } = await admin.from("billing_webhook_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event,
  });

  if (insertError) {
    // Unique violation on stripe_event_id means we've already processed this
    // event — acknowledge without reprocessing, per Stripe's own retry
    // guidance.
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(admin, event);
    await admin
      .from("billing_webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
  } catch (err) {
    await admin
      .from("billing_webhook_events")
      .update({ status: "failed", processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(admin: ReturnType<typeof createAdminClient>, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspace_id;
      if (!workspaceId || !session.subscription || !session.customer) return;

      const stripe = getStripeClient();
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await upsertWorkspaceSubscription(admin, workspaceId, subscription, session.customer as string);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const workspaceId = subscription.metadata?.workspace_id;
      if (!workspaceId) return;
      await upsertWorkspaceSubscription(admin, workspaceId, subscription, subscription.customer as string);
      break;
    }
    default:
      break;
  }
}

async function upsertWorkspaceSubscription(
  admin: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  subscription: Stripe.Subscription,
  stripeCustomerId: string,
) {
  const priceId = subscription.items.data[0]?.price.id;

  let planId: string | null = null;
  if (priceId) {
    const { data: price } = await admin.from("plan_prices").select("plan_id").eq("stripe_price_id", priceId).maybeSingle();
    planId = price?.plan_id ?? null;
  }

  await admin.from("workspace_subscriptions").upsert(
    {
      workspace_id: workspaceId,
      plan_id: planId,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    },
    { onConflict: "workspace_id" },
  );
}
