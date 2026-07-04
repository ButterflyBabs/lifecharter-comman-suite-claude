import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { Card, PageHeader, StatusBadge } from "@/components/ui";
import { createTemplate, addTemplateVersion, archiveTemplate } from "./actions";

const TEMPLATE_TYPES = [
  "email_sms",
  "outreach",
  "campaign",
  "content_brief",
  "proposal",
  "contract",
  "onboarding",
  "journey_program",
  "session",
  "progress_review",
  "renewal",
  "testimonial_referral",
  "sop",
  "automation",
  "review",
  "report",
];

type TemplateVersion = {
  id: string;
  version: number;
  content: string | null;
  schema_json: { variables?: string[] } | null;
  effective_at: string | null;
};

export default async function TemplatesPage() {
  const workspaceId = await getCurrentWorkspaceId();

  if (!workspaceId) {
    return (
      <div className="p-8">
        <PageHeader title="Templates" />
        <p className="mt-2 text-sm text-soft-taupe">No workspace yet.</p>
      </div>
    );
  }

  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("templates")
    .select("id, name, template_type, status, current_version_id, template_versions(id, version, content, schema_json, effective_at)")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="p-8">
      <PageHeader
        title="Templates"
        description="Reusable business templates, versioned with variables, owner, status, and usage links."
      />

      {templates && templates.length > 0 ? (
        <div className="mt-6 space-y-4">
          {templates.map((t) => {
            const versions = (t.template_versions as unknown as TemplateVersion[]).slice().sort((a, b) => b.version - a.version);
            const current = versions.find((v) => v.id === t.current_version_id);
            return (
              <Card key={t.id}>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-deep-indigo">{t.name}</h2>
                  <StatusBadge status={t.status} />
                </div>
                <p className="text-xs text-soft-taupe">{t.template_type.replace(/_/g, " ")}</p>

                {current && (
                  <div className="mt-2 rounded bg-soft-lavender/10 p-2 text-sm">
                    <p className="font-medium">Version {current.version}</p>
                    {current.content && <p className="whitespace-pre-wrap text-soft-taupe">{current.content}</p>}
                    {current.schema_json?.variables && current.schema_json.variables.length > 0 && (
                      <p className="mt-1 text-xs text-soft-taupe">
                        Variables: {current.schema_json.variables.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-deep-indigo underline">Add version</summary>
                  <form action={addTemplateVersion} className="mt-1 space-y-1">
                    <input type="hidden" name="template_id" value={t.id} />
                    <textarea
                      name="content"
                      placeholder="Template content, using {{variable}} placeholders"
                      rows={4}
                      className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      name="variables"
                      placeholder="Variables (comma-separated)"
                      className="w-full rounded border border-soft-taupe px-2 py-1 text-xs"
                    />
                    <button type="submit" className="lc-btn-secondary text-xs">
                      Add version
                    </button>
                  </form>
                </details>

                <form action={archiveTemplate} className="mt-2">
                  <input type="hidden" name="template_id" value={t.id} />
                  <button type="submit" className="lc-btn-secondary text-xs">
                    Archive
                  </button>
                </form>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="mt-6 text-sm text-soft-taupe">No templates yet.</p>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-deep-indigo underline">Create template</summary>
        <form action={createTemplate} className="mt-2 max-w-md space-y-2">
          <input
            type="text"
            name="name"
            placeholder="Template name"
            required
            className="w-full rounded border border-soft-taupe px-3 py-2 text-sm"
          />
          <select
            name="template_type"
            defaultValue=""
            required
            className="w-full rounded border border-soft-taupe bg-ivory-light px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Template type&hellip;
            </option>
            {TEMPLATE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <button type="submit" className="lc-btn-primary">
            Create template
          </button>
        </form>
      </details>
    </div>
  );
}
