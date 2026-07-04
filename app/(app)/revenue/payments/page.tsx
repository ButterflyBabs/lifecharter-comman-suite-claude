import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createOrder, recordPayment, requestRefund } from "./actions";

export default async function PaymentsPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Payments" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: orders }, { data: opportunities }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total, currency, status, opportunities(name), invoices(id, invoice_number, amount_due, status, payments(id, amount, status))")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("opportunities").select("id, name").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  return (
    <div className="p-8">
      <PageHeader
        title="Payments"
        description="Track orders, invoices, deposits, installments, failures, refunds, and reconciliation."
      />

      {orders && orders.length > 0 && (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => {
            const invoices = (o.invoices as unknown as { id: string; invoice_number: string; amount_due: number; status: string; payments: { id: string; amount: number; status: string }[] }[]) ?? [];
            return (
              <li key={o.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {(o.opportunities as unknown as { name: string } | null)?.name ?? "Order"}
                    </p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-soft-taupe">{o.currency} {o.total}</p>

                  {invoices.map((inv) => (
                    <div key={inv.id} className="mt-2 rounded bg-soft-lavender/10 p-2">
                      <div className="flex items-center justify-between">
                        <p>{inv.invoice_number} · {inv.amount_due} due</p>
                        <StatusBadge status={inv.status} />
                      </div>
                      {inv.payments?.map((p) => (
                        <p key={p.id} className="text-xs text-soft-taupe">
                          Payment {p.amount} · {p.status}
                          {p.status === "succeeded" && (
                            <form action={requestRefund} className="mt-1 inline-flex items-center gap-1">
                              <input type="hidden" name="payment_id" value={p.id} />
                              <input type="hidden" name="amount" value={p.amount} />
                              <input type="text" name="reason" placeholder="Refund reason" className="rounded border border-soft-taupe px-1 py-0.5 text-xs" />
                              <button type="submit" className="lc-btn-secondary text-xs">Request refund</button>
                            </form>
                          )}
                        </p>
                      ))}
                      {inv.status !== "paid" && (
                        <form action={recordPayment} className="mt-1 flex items-center gap-1">
                          <input type="hidden" name="invoice_id" value={inv.id} />
                          <input type="hidden" name="order_id" value={o.id} />
                          <input type="number" name="amount" placeholder="Amount" step="any" defaultValue={inv.amount_due} required className="w-20 rounded border border-soft-taupe px-1 py-0.5 text-xs" />
                          <input type="text" name="provider" placeholder="Provider" className="w-24 rounded border border-soft-taupe px-1 py-0.5 text-xs" />
                          <button type="submit" className="lc-btn-secondary text-xs">Record payment</button>
                        </form>
                      )}
                    </div>
                  ))}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create order</summary>
        <form action={createOrder} className="mt-2 max-w-md space-y-2">
          <select name="opportunity_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked opportunity</option>
            {opportunities?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input type="number" name="total" placeholder="Total" step="any" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="payment_terms" placeholder="Payment terms" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="date" name="due_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Create order</button>
        </form>
      </details>
    </div>
  );
}
