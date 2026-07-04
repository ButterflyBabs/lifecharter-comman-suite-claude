import Stripe from "stripe";

// Server-only. STRIPE_SECRET_KEY determines the mode (test vs live) —
// nothing in this codebase hardcodes or assumes one or the other. Never
// import this from a Client Component.
export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(secretKey, { apiVersion: "2024-06-20" });
}
