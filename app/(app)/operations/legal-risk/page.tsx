import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createLegalDocument, createRisk, closeRisk, logIncident } from "./actions";

export default async function LegalRiskPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Legal and Risk" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: documents }, { data: risks }, { data: incidents }] = await Promise.all([
    supabase.from("legal_documents").select("id, name, document_type, status, review_at").eq("workspace_id", workspaceId).order("review_at"),
    supabase.from("risks").select("id, category, title, severity, status, review_at").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("incidents").select("id, severity, summary, response, occurred_at, risks(title)").eq("workspace_id", workspaceId).order("occurred_at", { ascending: false }),
  ]);

  const openRisks = (risks ?? []).filter((r) => r.status !== "closed");

  return (
    <div className="p-8">
      <PageHeader
        title="Legal and Risk"
        description="Track agreements, policies, reviews, risks, incidents, and continuity plans."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Legal documents</h2>
          <ul className="mt-3 space-y-2">
            {(documents ?? []).map((d) => (
              <li key={d.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{d.name}</p>
                    <StatusBadge status={d.status} />
                  </div>
                  {d.document_type && <p className="text-soft-taupe">{d.document_type}</p>}
                  {d.review_at && <p className="text-xs text-soft-taupe">Review by {new Date(d.review_at).toLocaleDateString()}</p>}
                </Card>
              </li>
            ))}
            {(!documents || documents.length === 0) && <p className="text-sm text-soft-taupe">No legal documents yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add legal document</summary>
            <form action={createLegalDocument} className="mt-2 max-w-md space-y-2">
              <input type="text" name="name" placeholder="Document name" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="document_type" placeholder="Document type" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add document</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Risk register</h2>
          <ul className="mt-3 space-y-2">
            {openRisks.map((r) => (
              <li key={r.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.title}</p>
                    {r.severity && <StatusBadge status={r.severity} tone={r.severity === "critical" || r.severity === "high" ? "warning" : "neutral"} />}
                  </div>
                  {r.category && <p className="text-soft-taupe">{r.category}</p>}
                  {r.review_at && <p className="text-xs text-soft-taupe">Review by {new Date(r.review_at).toLocaleDateString()}</p>}
                  <form action={closeRisk} className="mt-1">
                    <input type="hidden" name="risk_id" value={r.id} />
                    <button type="submit" className="lc-btn-secondary text-xs">Close</button>
                  </form>
                </Card>
              </li>
            ))}
            {openRisks.length === 0 && <p className="text-sm text-soft-taupe">No open risks.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add risk</summary>
            <form action={createRisk} className="mt-2 max-w-md space-y-2">
              <input type="text" name="title" placeholder="Risk title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="category" placeholder="Category" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <select name="probability" defaultValue="" className="rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                  <option value="">Probability&hellip;</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <select name="impact" defaultValue="" className="rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                  <option value="">Impact&hellip;</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <select name="severity" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Severity&hellip;</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <textarea name="response_plan" placeholder="Response plan" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="backup_plan" placeholder="Backup plan" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="date" name="review_at" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add risk</button>
            </form>
          </details>

          <h2 className="mt-6 text-lg font-semibold text-deep-indigo">Incidents</h2>
          <ul className="mt-3 space-y-2">
            {(incidents ?? []).map((i) => (
              <li key={i.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{i.summary}</p>
                    {i.severity && <StatusBadge status={i.severity} />}
                  </div>
                  {i.risks && <p className="text-soft-taupe">Related risk: {(i.risks as unknown as { title: string } | null)?.title}</p>}
                  <p className="text-xs text-soft-taupe">{new Date(i.occurred_at).toLocaleDateString()}</p>
                </Card>
              </li>
            ))}
            {(!incidents || incidents.length === 0) && <p className="text-sm text-soft-taupe">No incidents logged.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Log incident</summary>
            <form action={logIncident} className="mt-2 max-w-md space-y-2">
              <select name="risk_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">No related risk</option>
                {risks?.map((r) => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
              <select name="severity" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Severity&hellip;</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <textarea name="summary" placeholder="Summary" rows={2} required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="response" placeholder="Response" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Log incident</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
