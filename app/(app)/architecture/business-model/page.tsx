import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { saveBusinessModel, approveBusinessModel } from "./actions";

function ListField({
  id,
  label,
  defaultValue,
}: {
  id: string;
  label: string;
  defaultValue: string[] | null;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-deep-indigo">
        {label} <span className="text-xs text-soft-taupe">(one per line)</span>
      </label>
      <textarea
        id={id}
        name={id}
        rows={3}
        defaultValue={(defaultValue ?? []).join("\n")}
        className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
      />
    </div>
  );
}

export default async function BusinessModelPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Business Model" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: model } = await supabase
    .from("business_models")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  return (
    <div className="p-8">
      <PageHeader
        title="Business Model"
        description="How value is created, delivered, captured, and sustained."
        actions={
          model ? (
            <>
              <StatusBadge status={model.status} />
              {model.status === "draft" && (
                <form action={approveBusinessModel}>
                  <button type="submit" className="lc-btn-secondary">
                    Approve
                  </button>
                </form>
              )}
            </>
          ) : undefined
        }
      />

      <Card className="mt-6">
        <form action={saveBusinessModel} className="space-y-4">
          <ListField id="model_types" label="Business model types" defaultValue={model?.model_types ?? null} />
          <ListField id="customer_groups" label="Customer groups" defaultValue={model?.customer_groups ?? null} />
          <ListField id="value_exchanges" label="Value exchanges" defaultValue={model?.value_exchanges ?? null} />
          <ListField id="revenue_streams" label="Revenue streams" defaultValue={model?.revenue_streams ?? null} />
          <ListField id="delivery_models" label="Delivery models" defaultValue={model?.delivery_models ?? null} />
          <div>
            <label htmlFor="cost_structure" className="block text-sm font-medium text-deep-indigo">
              Cost structure
            </label>
            <textarea
              id="cost_structure"
              name="cost_structure"
              rows={2}
              defaultValue={model?.cost_structure ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <ListField id="key_resources" label="Key resources" defaultValue={model?.key_resources ?? null} />
          <ListField id="key_activities" label="Key activities" defaultValue={model?.key_activities ?? null} />
          <ListField id="partners" label="Partners" defaultValue={model?.partners ?? null} />
          <div>
            <label htmlFor="constraints" className="block text-sm font-medium text-deep-indigo">
              Constraints
            </label>
            <textarea
              id="constraints"
              name="constraints"
              rows={2}
              defaultValue={model?.constraints ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="revenue_concentration" className="block text-sm font-medium text-deep-indigo">
              Revenue concentration
            </label>
            <textarea
              id="revenue_concentration"
              name="revenue_concentration"
              rows={2}
              defaultValue={model?.revenue_concentration ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="recurring_vs_onetime_mix" className="block text-sm font-medium text-deep-indigo">
              Recurring and one-time revenue mix
            </label>
            <textarea
              id="recurring_vs_onetime_mix"
              name="recurring_vs_onetime_mix"
              rows={2}
              defaultValue={model?.recurring_vs_onetime_mix ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="lc-btn-primary">
            Save business model{model ? ` (v${(model.version ?? 1) + 1})` : ""}
          </button>
        </form>
      </Card>
    </div>
  );
}
