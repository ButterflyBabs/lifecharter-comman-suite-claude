import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addLead, updateLeadStatus, draftOutreachMessage, approveAndSendMessage } from "./actions";

export default async function OutreachPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Outreach" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: leads }, { data: people }, { data: organizations }, { data: businessUnits }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status, pathway, qualification_rationale, outreach_angle, next_action, people(preferred_name), organizations(name), business_units(name)")
      .eq("workspace_id", workspaceId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("people").select("id, preferred_name").eq("workspace_id", workspaceId),
    supabase.from("organizations").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("business_units").select("id, name").eq("workspace_id", workspaceId).eq("status", "active").order("name"),
  ]);

  const leadIds = (leads ?? []).map((l) => l.id);
  const { data: scores } =
    leadIds.length > 0
      ? await supabase.from("lead_scores").select("lead_id, fit_score, priority_score").in("lead_id", leadIds)
      : { data: null };
  const scoreByLead = new Map((scores ?? []).map((s) => [s.lead_id, s]));

  const { data: messages } =
    leadIds.length > 0
      ? await supabase
          .from("outreach_messages")
          .select("id, lead_id, subject, approval_status, sent_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: null };
  const messagesByLead = new Map<string, NonNullable<typeof messages>>();
  for (const m of messages ?? []) {
    if (!messagesByLead.has(m.lead_id)) messagesByLead.set(m.lead_id, []);
    messagesByLead.get(m.lead_id)!.push(m);
  }

  return (
    <div className="p-8">
      <PageHeader
        title="Outreach"
        description="Research, qualify, contact, and develop B2B, B2C, and partnership relationships through one shared engine."
      />

      {leads && leads.length > 0 && (
        <ul className="mt-6 space-y-3">
          {leads.map((l) => {
            const score = scoreByLead.get(l.id);
            const leadMessages = messagesByLead.get(l.id) ?? [];
            return (
              <li key={l.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">
                      {(l.people as unknown as { preferred_name: string } | null)?.preferred_name ??
                        (l.organizations as unknown as { name: string } | null)?.name ??
                        "Unnamed lead"}
                      {l.pathway ? ` · ${l.pathway.toUpperCase()}` : ""}
                      {(l.business_units as unknown as { name: string } | null)?.name
                        ? ` · ${(l.business_units as unknown as { name: string }).name}`
                        : ""}
                    </p>
                    <StatusBadge status={l.status} />
                  </div>
                  {score && (
                    <p className="text-xs text-soft-taupe">
                      Fit {score.fit_score ?? "—"} · Priority {score.priority_score ?? "—"}
                    </p>
                  )}
                  {l.outreach_angle && <p className="mt-1 text-soft-taupe">Angle: {l.outreach_angle}</p>}
                  {l.next_action && <p>Next: {l.next_action}</p>}

                  {leadMessages.map((m) => (
                    <div key={m.id} className="mt-2 flex items-center justify-between rounded bg-soft-lavender/10 p-2 text-xs">
                      <span>{m.subject ?? "(no subject)"}</span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={m.approval_status} />
                        {m.approval_status !== "approved" && !m.sent_at && (
                          <form action={approveAndSendMessage}>
                            <input type="hidden" name="message_id" value={m.id} />
                            <button type="submit" className="lc-btn-secondary text-xs">Approve and send</button>
                          </form>
                        )}
                      </span>
                    </div>
                  ))}

                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={updateLeadStatus} className="flex items-center gap-1">
                      <input type="hidden" name="lead_id" value={l.id} />
                      <select name="status" defaultValue={l.status} className="rounded border border-soft-taupe bg-ivory-light px-2 py-1 text-xs">
                        <option value="new">New</option>
                        <option value="researching">Researching</option>
                        <option value="qualified">Qualified</option>
                        <option value="disqualified">Disqualified</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                      </select>
                      <button type="submit" className="lc-btn-secondary text-xs">Update</button>
                    </form>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-deep-indigo underline">Draft outreach message</summary>
                    <form action={draftOutreachMessage} className="mt-2 space-y-2">
                      <input type="hidden" name="lead_id" value={l.id} />
                      <input type="text" name="subject" placeholder="Subject" className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <textarea name="body" placeholder="Message body" rows={2} className="w-full rounded border border-soft-taupe px-2 py-1 text-xs" />
                      <button type="submit" className="lc-btn-secondary text-xs">Save draft</button>
                    </form>
                  </details>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Add lead</summary>
        <form action={addLead} className="mt-2 max-w-md space-y-2">
          <select name="person_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked person</option>
            {people?.map((p) => (
              <option key={p.id} value={p.id}>{p.preferred_name}</option>
            ))}
          </select>
          <select name="organization_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No linked organization</option>
            {organizations?.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select name="pathway" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
            <option value="">No pathway</option>
            <option value="b2b">B2B</option>
            <option value="b2c">B2C</option>
            <option value="partner">Partner</option>
          </select>
          {businessUnits && businessUnits.length > 0 && (
            <select name="business_unit_id" defaultValue="" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="">No business unit</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.id}>{bu.name}</option>
              ))}
            </select>
          )}
          <textarea name="qualification_rationale" placeholder="Qualification rationale" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="outreach_angle" placeholder="Outreach angle" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <input type="text" name="next_action" placeholder="Next action" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
          <button type="submit" className="lc-btn-primary">Add lead</button>
        </form>
      </details>
    </div>
  );
}
