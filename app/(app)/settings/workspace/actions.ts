"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveCname, resolve4 } from "node:dns/promises";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";
import { isWorkspaceAdmin } from "@/lib/data/workspace";

// Vercel's documented custom-domain targets: a CNAME to this host for any
// subdomain, or this anycast A record for an apex/root domain (which can't
// hold a CNAME per the DNS spec). Verification only checks DNS ownership —
// it never calls Vercel's API to actually attach the domain to the live
// project, per explicit user decision; that stays a manual step in the
// Vercel dashboard once a workspace owner sees "verified" here.
const VERCEL_CNAME_TARGET = "cname.vercel-dns.com";
const VERCEL_A_RECORD = "76.76.21.21";

export async function updateWorkspace(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20workspace%20settings");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      name: formData.get("name") as string,
      timezone: formData.get("timezone") as string,
      currency: formData.get("currency") as string,
      locale: formData.get("locale") as string,
    })
    .eq("id", workspaceId);

  if (error) {
    redirect(`/settings/workspace?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/workspace");
}

export async function updateBranding(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20change%20branding");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("workspaces")
    .update({
      client_portal_display_name: (formData.get("display_name") as string) || null,
      client_portal_logo_url: (formData.get("logo_url") as string) || null,
      client_portal_primary_color: (formData.get("primary_color") as string) || null,
    })
    .eq("id", workspaceId);

  if (error) {
    redirect(`/settings/workspace?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings/workspace");
  revalidatePath("/clients/portal");
}

export async function addDomain(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20add%20a%20domain");
  }

  const domain = (formData.get("domain") as string)?.trim().toLowerCase();
  if (!domain) redirect("/settings/workspace?error=Domain%20is%20required");

  const supabase = await createClient();
  const { error } = await supabase.from("workspace_domains").insert({ workspace_id: workspaceId, domain });

  if (error) {
    const message = error.message.includes("duplicate key") ? "That domain is already registered to a workspace" : error.message;
    redirect(`/settings/workspace?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/settings/workspace");
}

// Real DNS verification — never calls Vercel's API. Checks whether the
// domain's DNS actually points at Vercel yet (CNAME for a subdomain, A
// record for an apex domain, since apex domains can't hold a CNAME).
export async function checkDomainDns(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20check%20a%20domain");
  }

  const domainId = formData.get("domain_id") as string;
  const supabase = await createClient();

  const { data: domainRow } = await supabase
    .from("workspace_domains")
    .select("id, domain")
    .eq("id", domainId)
    .eq("workspace_id", workspaceId)
    .single();

  if (!domainRow) redirect("/settings/workspace?error=Domain%20not%20found");

  let verified = false;
  try {
    const cnames = await resolveCname(domainRow!.domain);
    verified = cnames.some((c) => c.toLowerCase().replace(/\.$/, "") === VERCEL_CNAME_TARGET);
  } catch {
    // Not a CNAME — likely an apex domain. Fall through to the A record check.
  }
  if (!verified) {
    try {
      const addresses = await resolve4(domainRow!.domain);
      verified = addresses.includes(VERCEL_A_RECORD);
    } catch {
      // Still not resolvable to a Vercel target — stays pending.
    }
  }

  await supabase
    .from("workspace_domains")
    .update({
      status: verified ? "verified" : "pending_dns",
      last_checked_at: new Date().toISOString(),
      verified_at: verified ? new Date().toISOString() : null,
    })
    .eq("id", domainId);

  revalidatePath("/settings/workspace");
}

export async function removeDomain(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  if (!(await isWorkspaceAdmin(workspaceId))) {
    redirect("/settings/workspace?error=Only%20the%20Workspace%20Owner%20or%20Administrator%20can%20remove%20a%20domain");
  }

  const supabase = await createClient();
  await supabase
    .from("workspace_domains")
    .delete()
    .eq("id", formData.get("domain_id") as string)
    .eq("workspace_id", workspaceId);

  revalidatePath("/settings/workspace");
}
