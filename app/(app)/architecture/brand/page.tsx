import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { saveBrandProfile, approveBrandProfile, addMessagePillar, addClaimRule, addProofItem } from "./actions";

export default async function BrandPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Brand and Messaging" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("brand_profiles")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  const [{ data: pillars }, { data: claims }, { data: proof }] = await Promise.all([
    profile
      ? supabase.from("message_pillars").select("id, title, message, audience, proof_required").eq("brand_profile_id", profile.id)
      : Promise.resolve({ data: null }),
    profile
      ? supabase.from("claim_rules").select("id, claim_text, status, scope").eq("brand_profile_id", profile.id)
      : Promise.resolve({ data: null }),
    supabase.from("proof_items").select("id, proof_type, title, consent_status").eq("workspace_id", workspaceId),
  ]);

  const voiceTraits: string[] = Array.isArray(profile?.voice_traits) ? profile.voice_traits : [];
  const preferredVocabulary: string[] = Array.isArray(profile?.preferred_vocabulary) ? profile.preferred_vocabulary : [];
  const avoidList: string[] = Array.isArray(profile?.avoid_list) ? profile.avoid_list : [];
  const callsToAction: string[] = Array.isArray(profile?.calls_to_action) ? profile.calls_to_action : [];

  return (
    <div className="p-8">
      <PageHeader
        title="Brand and Messaging"
        description="One canonical source for voice, promises, proof, claims, and messaging rules."
        actions={
          profile ? (
            <>
              <StatusBadge status={profile.status} />
              {profile.status === "draft" && (
                <form action={approveBrandProfile}>
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
        <form action={saveBrandProfile} className="space-y-4">
          <div>
            <label htmlFor="brand_identity_description" className="block text-sm font-medium text-deep-indigo">
              Brand identity and description
            </label>
            <textarea
              id="brand_identity_description"
              name="brand_identity_description"
              rows={2}
              defaultValue={profile?.brand_identity_description ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="voice_traits" className="block text-sm font-medium text-deep-indigo">
              Voice traits <span className="text-xs text-soft-taupe">(one per line)</span>
            </label>
            <textarea
              id="voice_traits"
              name="voice_traits"
              rows={2}
              defaultValue={voiceTraits.join("\n")}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="formality" className="block text-sm font-medium text-deep-indigo">
                Formality
              </label>
              <input
                id="formality"
                name="formality"
                type="text"
                defaultValue={profile?.formality ?? ""}
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="average_length" className="block text-sm font-medium text-deep-indigo">
                Average length
              </label>
              <input
                id="average_length"
                name="average_length"
                type="text"
                defaultValue={profile?.average_length ?? ""}
                className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label htmlFor="preferred_vocabulary" className="block text-sm font-medium text-deep-indigo">
              Preferred vocabulary <span className="text-xs text-soft-taupe">(one per line)</span>
            </label>
            <textarea
              id="preferred_vocabulary"
              name="preferred_vocabulary"
              rows={2}
              defaultValue={preferredVocabulary.join("\n")}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="avoid_list" className="block text-sm font-medium text-deep-indigo">
              Words and phrases to avoid <span className="text-xs text-soft-taupe">(one per line)</span>
            </label>
            <textarea
              id="avoid_list"
              name="avoid_list"
              rows={2}
              defaultValue={avoidList.join("\n")}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="core_promise" className="block text-sm font-medium text-deep-indigo">
              Core promise
            </label>
            <textarea
              id="core_promise"
              name="core_promise"
              rows={2}
              defaultValue={profile?.core_promise ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="compliance_language" className="block text-sm font-medium text-deep-indigo">
              Required compliance language
            </label>
            <textarea
              id="compliance_language"
              name="compliance_language"
              rows={2}
              defaultValue={profile?.compliance_language ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="calls_to_action" className="block text-sm font-medium text-deep-indigo">
              Calls to action <span className="text-xs text-soft-taupe">(one per line)</span>
            </label>
            <textarea
              id="calls_to_action"
              name="calls_to_action"
              rows={2}
              defaultValue={callsToAction.join("\n")}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="signoff" className="block text-sm font-medium text-deep-indigo">
              Sign-off
            </label>
            <input
              id="signoff"
              name="signoff"
              type="text"
              defaultValue={profile?.signoff ?? ""}
              className="mt-1 w-full rounded border border-soft-taupe px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="lc-btn-primary">
            Save brand profile{profile ? ` (v${(profile.version ?? 1) + 1})` : ""}
          </button>
        </form>
      </Card>

      {profile && (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-deep-indigo">Message pillars</h2>
            {pillars && pillars.length > 0 && (
              <ul className="mt-2 space-y-2">
                {pillars.map((p) => (
                  <li key={p.id}>
                    <Card className="text-sm">
                      <p className="font-medium">{p.title}</p>
                      <p className="text-soft-taupe">{p.message}</p>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-deep-indigo underline">Add message pillar</summary>
              <form action={addMessagePillar} className="mt-2 max-w-md space-y-2">
                <input type="hidden" name="brand_profile_id" value={profile.id} />
                <input type="text" name="title" placeholder="Pillar title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <textarea name="message" placeholder="Message" required rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <input type="text" name="audience" placeholder="Audience" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="proof_required" /> Proof required
                </label>
                <button type="submit" className="lc-btn-secondary">Add pillar</button>
              </form>
            </details>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-deep-indigo">Claim rules</h2>
            {claims && claims.length > 0 && (
              <ul className="mt-2 space-y-2">
                {claims.map((c) => (
                  <li key={c.id}>
                    <Card className="flex items-center justify-between text-sm">
                      <span>{c.claim_text}</span>
                      <StatusBadge status={c.status} />
                    </Card>
                  </li>
                ))}
              </ul>
            )}
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-deep-indigo underline">Add claim rule</summary>
              <form action={addClaimRule} className="mt-2 max-w-md space-y-2">
                <input type="hidden" name="brand_profile_id" value={profile.id} />
                <textarea name="claim_text" placeholder="Claim text" required rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <select name="status" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
                  <option value="approved">Approved</option>
                  <option value="restricted">Restricted</option>
                  <option value="prohibited">Prohibited</option>
                </select>
                <input type="text" name="scope" placeholder="Scope" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <input type="text" name="required_disclaimer" placeholder="Required disclaimer" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
                <button type="submit" className="lc-btn-secondary">Add claim rule</button>
              </form>
            </details>
          </section>
        </>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-deep-indigo">Proof library</h2>
        {proof && proof.length > 0 && (
          <ul className="mt-2 space-y-2">
            {proof.map((p) => (
              <li key={p.id}>
                <Card className="flex items-center justify-between text-sm">
                  <span>
                    {p.title} <span className="text-soft-taupe">({p.proof_type})</span>
                  </span>
                  <StatusBadge status={p.consent_status} />
                </Card>
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-deep-indigo underline">Add proof item</summary>
          <form action={addProofItem} className="mt-2 max-w-md space-y-2">
            <select name="proof_type" required className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm">
              <option value="testimonial">Testimonial</option>
              <option value="outcome">Outcome</option>
              <option value="credential">Credential</option>
              <option value="evidence">Evidence</option>
            </select>
            <input type="text" name="title" placeholder="Title" required className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <textarea name="statement" placeholder="Statement" rows={2} className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <input type="text" name="source" placeholder="Source" className="w-full rounded border border-soft-taupe px-3 py-2 text-sm" />
            <select name="consent_status" className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm" defaultValue="pending">
              <option value="pending">Pending</option>
              <option value="granted">Granted</option>
              <option value="revoked">Revoked</option>
            </select>
            <button type="submit" className="lc-btn-secondary">Add proof item</button>
          </form>
        </details>
      </section>
    </div>
  );
}
