"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateRoadmapFromAudit } from "@/lib/roadmap/generate";

export async function submitAudit(formData: FormData) {
  const instanceId = formData.get("instance_id") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: instance } = await supabase
    .from("audit_instances")
    .select("workspace_id")
    .eq("id", instanceId)
    .single();

  if (!instance) {
    redirect("/roadmap/audit?error=Audit+instance+not+found");
  }

  const responseRows: { audit_instance_id: string; question_id: string; score: number; workspace_id: string }[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("score_")) continue;
    const questionId = key.slice("score_".length);
    const score = Number(value);
    if (Number.isNaN(score)) continue;
    responseRows.push({
      audit_instance_id: instanceId,
      question_id: questionId,
      score,
      workspace_id: instance!.workspace_id,
    });
  }

  if (responseRows.length > 0) {
    await supabase.from("audit_responses").upsert(responseRows, { onConflict: "audit_instance_id,question_id" });
  }

  await supabase
    .from("audit_instances")
    .update({ status: "completed", period_end: new Date().toISOString().slice(0, 10) })
    .eq("id", instanceId);

  const roadmapId = await generateRoadmapFromAudit(supabase, instance!.workspace_id, instanceId, user!.id);

  redirect(roadmapId ? "/roadmap/plan" : "/roadmap/audit");
}
