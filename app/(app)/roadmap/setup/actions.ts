"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Workspace creation is the one operation in the app that must run as the
// service role: RLS deliberately grants no INSERT policy on workspaces,
// workspace_members, or member_roles to the authenticated role (Section
// 11.3 — membership/role management is owner/admin-only, and there's no
// owner yet at the moment a workspace is born). Every write here is
// followed by an audit_events row per Section 11.6 ("service-role
// operations are server-only and fully audited").
export async function createWorkspace(formData: FormData) {
  const name = formData.get("name") as string;
  const timezone = (formData.get("timezone") as string) || "UTC";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "workspace";

  const fullSlug = `${slug}-${Date.now().toString(36)}`;

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .insert({ name, slug: fullSlug, timezone, created_by: user.id, updated_by: user.id })
    .select("id")
    .single();

  if (workspaceError || !workspace) {
    redirect(`/roadmap/setup?error=${encodeURIComponent(workspaceError?.message ?? "Could not create workspace")}`);
  }

  const { data: member, error: memberError } = await admin
    .from("workspace_members")
    .insert({ workspace_id: workspace!.id, user_id: user.id, status: "active", joined_at: new Date().toISOString() })
    .select("id")
    .single();

  if (memberError || !member) {
    redirect(`/roadmap/setup?error=${encodeURIComponent(memberError?.message ?? "Could not create membership")}`);
  }

  const { data: ownerRole } = await admin
    .from("roles")
    .select("id")
    .is("workspace_id", null)
    .eq("name", "Workspace Owner")
    .single();

  if (ownerRole) {
    await admin.from("member_roles").insert({ workspace_member_id: member!.id, role_id: ownerRole.id });
  }

  await admin.from("audit_events").insert({
    workspace_id: workspace!.id,
    actor: user.id,
    action: "workspace.bootstrap",
    resource_type: "workspaces",
    resource_id: workspace!.id,
    after_json: { name, slug: fullSlug, created_via: "setup_wizard" },
  });

  redirect("/roadmap/audit");
}
