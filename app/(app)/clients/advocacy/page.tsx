import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { addTestimonial, updateTestimonialConsent, addReferral, updateReferralStatus, addCaseStudy, updateCaseStudyConsent } from "./actions";

export default async function AdvocacyPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Advocacy" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: testimonials }, { data: referrals }, { data: caseStudies }, { data: clients }] = await Promise.all([
    supabase.from("testimonials").select("id, statement, format, consent_status, clients(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("referrals").select("id, status, incentive, clients:referring_client_id(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("case_studies").select("id, situation, outcome, consent_status, clients(organizations(name))").eq("workspace_id", workspaceId).order("created_at", { ascending: false }),
    supabase.from("clients").select("id, organizations(name)").eq("workspace_id", workspaceId),
  ]);

  const orgName = (c: { organizations: unknown } | null) => (c?.organizations as { name: string } | null)?.name ?? "Untitled client";

  return (
    <div className="p-8">
      <PageHeader
        title="Advocacy"
        description="Testimonials, referrals, and case studies — no public use without explicit consent and approved wording."
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Testimonials</h2>
          <ul className="mt-3 space-y-2">
            {(testimonials ?? []).map((t) => (
              <li key={t.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(t.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={t.consent_status} />
                  </div>
                  <p className="text-soft-taupe">{t.statement}</p>
                  {t.consent_status === "pending" && (
                    <form action={updateTestimonialConsent} className="mt-1">
                      <input type="hidden" name="testimonial_id" value={t.id} />
                      <input type="hidden" name="next_status" value="granted" />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark consent granted</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!testimonials || testimonials.length === 0) && <p className="text-sm text-soft-taupe">No testimonials yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add testimonial</summary>
            <form action={addTestimonial} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <textarea name="statement" placeholder="Statement" rows={3} required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="format" placeholder="Format (written, video...)" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add testimonial</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Referrals</h2>
          <ul className="mt-3 space-y-2">
            {(referrals ?? []).map((r) => (
              <li key={r.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(r.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  {r.incentive && <p className="text-xs text-soft-taupe">Incentive: {r.incentive}</p>}
                  {r.status === "new" && (
                    <form action={updateReferralStatus} className="mt-1">
                      <input type="hidden" name="referral_id" value={r.id} />
                      <input type="hidden" name="next_status" value="contacted" />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark contacted</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!referrals || referrals.length === 0) && <p className="text-sm text-soft-taupe">No referrals yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add referral</summary>
            <form action={addReferral} className="mt-2 max-w-md space-y-2">
              <select name="referring_client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Referring client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <input type="text" name="incentive" placeholder="Incentive" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add referral</button>
            </form>
          </details>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-deep-indigo">Case studies</h2>
          <ul className="mt-3 space-y-2">
            {(caseStudies ?? []).map((cs) => (
              <li key={cs.id}>
                <Card className="text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{orgName(cs.clients as unknown as { organizations: unknown } | null)}</p>
                    <StatusBadge status={cs.consent_status} />
                  </div>
                  {cs.situation && <p className="text-soft-taupe">{cs.situation}</p>}
                  {cs.outcome && <p className="text-xs text-soft-taupe">Outcome: {cs.outcome}</p>}
                  {cs.consent_status === "pending" && (
                    <form action={updateCaseStudyConsent} className="mt-1">
                      <input type="hidden" name="case_study_id" value={cs.id} />
                      <input type="hidden" name="next_status" value="granted" />
                      <button type="submit" className="lc-btn-secondary text-xs">Mark consent granted</button>
                    </form>
                  )}
                </Card>
              </li>
            ))}
            {(!caseStudies || caseStudies.length === 0) && <p className="text-sm text-soft-taupe">No case studies yet.</p>}
          </ul>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-deep-indigo underline">Add case study</summary>
            <form action={addCaseStudy} className="mt-2 max-w-md space-y-2">
              <select name="client_id" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                <option value="">Select client&hellip;</option>
                {clients?.map((c) => (
                  <option key={c.id} value={c.id}>{orgName(c as unknown as { organizations: unknown } | null)}</option>
                ))}
              </select>
              <textarea name="situation" placeholder="Situation" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="intervention" placeholder="Intervention" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <textarea name="outcome" placeholder="Outcome" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <input type="text" name="evidence" placeholder="Evidence" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
              <button type="submit" className="lc-btn-primary">Add case study</button>
            </form>
          </details>
        </section>
      </div>
    </div>
  );
}
