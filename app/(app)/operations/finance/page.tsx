import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatTile, StatusBadge, IconBadge, IconDollarSign, IconReceipt, IconClipboard } from "@/components/ui";
import { createBudget, addBudgetLine, createExpenseCategory, addExpense } from "./actions";

export default async function FinancePage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Finance" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: budgets }, { data: categories }, { data: recentExpenses }, { data: vendors }, { data: unpaidInvoices }] = await Promise.all([
    supabase.from("budgets").select("id, period, scenario, status, budget_lines(id, category, planned_amount, actual_amount)").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("expense_categories").select("id, name").eq("workspace_id", workspaceId).eq("active", true),
    supabase.from("expenses").select("id, amount, occurred_at, source, expense_categories(name)").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }).limit(20),
    supabase.from("vendors").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("invoices").select("id, amount_due").eq("workspace_id", workspaceId).neq("status", "paid"),
  ]);

  const totalExpenses30d = (recentExpenses ?? []).reduce((sum, e) => sum + Number(e.amount ?? 0), 0);
  const receivables = (unpaidInvoices ?? []).reduce((sum, i) => sum + Number(i.amount_due ?? 0), 0);

  return (
    <div className="p-8">
      <PageHeader
        title="Finance"
        description="Business-level financial visibility without replacing the accounting system of record."
      />

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile value={`$${totalExpenses30d.toLocaleString()}`} label="Recent expenses (last 20 records)" icon={<IconDollarSign />} />
        <StatTile value={`$${receivables.toLocaleString()}`} label="Outstanding receivables" icon={<IconReceipt />} />
        <StatTile value={budgets?.length ?? 0} label="Budget versions" icon={<IconClipboard />} />
      </section>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconClipboard /></IconBadge>
          Budgets
        </h2>
        {budgets && budgets.length > 0 ? (
          <div className="mt-3 space-y-3">
            {budgets.map((b) => (
              <Card key={b.id}>
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{b.period} — {b.scenario.replace(/_/g, " ")}</h3>
                  <StatusBadge status={b.status} />
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {(b.budget_lines ?? []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between">
                      <span>{l.category}</span>
                      <span className="text-soft-taupe">${l.actual_amount ?? 0} / ${l.planned_amount ?? 0}</span>
                    </li>
                  ))}
                  {(b.budget_lines ?? []).length === 0 && <li className="text-soft-taupe">No lines yet.</li>}
                </ul>
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Add line</summary>
                  <form action={addBudgetLine} className="mt-1 space-y-1">
                    <input type="hidden" name="budget_id" value={b.id} />
                    <input type="text" name="category" placeholder="Category" required className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="number" name="planned_amount" placeholder="Planned amount" step="any" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <input type="number" name="actual_amount" placeholder="Actual amount" step="any" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                    <button type="submit" className="lc-btn-secondary text-xs">Add</button>
                  </form>
                </details>
              </Card>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-soft-taupe">No budgets yet.</p>
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Create budget</summary>
          <form action={createBudget} className="mt-2 max-w-md space-y-2">
            <input type="text" name="period" placeholder="Period (e.g. 2026-Q3)" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="scenario" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="best_case">Best case</option>
              <option value="base_case">Base case</option>
              <option value="downside">Downside</option>
            </select>
            <button type="submit" className="lc-btn-primary">Create budget</button>
          </form>
        </details>
      </section>

      <section className="mt-8">
        <h2 className="lc-section-heading text-lg font-semibold text-deep-indigo">
          <IconBadge size="sm"><IconReceipt /></IconBadge>
          Recent expenses
        </h2>
        <ul className="mt-3 space-y-2">
          {(recentExpenses ?? []).map((e) => (
            <li key={e.id}>
              <Card className="flex items-center justify-between text-sm">
                <span>{(e.expense_categories as unknown as { name: string } | null)?.name ?? "Uncategorized"} {e.source ? `· ${e.source}` : ""}</span>
                <span className="text-soft-taupe">${Number(e.amount).toLocaleString()} · {new Date(e.occurred_at).toLocaleDateString()}</span>
              </Card>
            </li>
          ))}
          {(!recentExpenses || recentExpenses.length === 0) && <p className="text-sm text-soft-taupe">No expenses recorded yet.</p>}
        </ul>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Record expense</summary>
          <form action={addExpense} className="mt-2 max-w-md space-y-2">
            <select name="category_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No category</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select name="vendor_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No vendor</option>
              {vendors?.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <input type="number" name="amount" placeholder="Amount" step="any" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="date" name="occurred_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="source" placeholder="Source" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Record expense</button>
          </form>
        </details>

        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add expense category</summary>
          <form action={createExpenseCategory} className="mt-2 max-w-md space-y-2">
            <input type="text" name="name" placeholder="Category name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <button type="submit" className="lc-btn-primary">Add category</button>
          </form>
        </details>
      </section>

      <Card className="mt-8 text-sm text-soft-taupe">
        This view summarizes records already in this workspace — it is not a
        connected accounting sync yet (Section 6&apos;s stated rule: financial
        summaries must trace to a source record and display freshness; AI
        commentary is never presented as audited financial advice).
      </Card>
    </div>
  );
}
