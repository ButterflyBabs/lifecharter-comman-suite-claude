"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWorkspaceId } from "@/lib/data/current-workspace";

export async function addTestimonial(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("testimonials").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    statement: formData.get("statement") as string,
    format: (formData.get("format") as string) || null,
  });

  revalidatePath("/clients/advocacy");
}

export async function updateTestimonialConsent(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("testimonials").update({ consent_status: formData.get("next_status") as string }).eq("id", formData.get("testimonial_id") as string);

  revalidatePath("/clients/advocacy");
}

export async function addReferral(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("referrals").insert({
    workspace_id: workspaceId,
    referring_client_id: formData.get("referring_client_id") as string,
    incentive: (formData.get("incentive") as string) || null,
  });

  revalidatePath("/clients/advocacy");
}

export async function updateReferralStatus(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("referrals").update({ status: formData.get("next_status") as string }).eq("id", formData.get("referral_id") as string);

  revalidatePath("/clients/advocacy");
}

export async function addCaseStudy(formData: FormData) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect("/roadmap/setup");

  const supabase = await createClient();
  await supabase.from("case_studies").insert({
    workspace_id: workspaceId,
    client_id: formData.get("client_id") as string,
    situation: (formData.get("situation") as string) || null,
    intervention: (formData.get("intervention") as string) || null,
    outcome: (formData.get("outcome") as string) || null,
    evidence: (formData.get("evidence") as string) || null,
  });

  revalidatePath("/clients/advocacy");
}

export async function updateCaseStudyConsent(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("case_studies").update({ consent_status: formData.get("next_status") as string }).eq("id", formData.get("case_study_id") as string);

  revalidatePath("/clients/advocacy");
}
